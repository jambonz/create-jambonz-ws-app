const Anthropic = require('@anthropic-ai/sdk');
const assert = require('assert');
const ANTHROPIC_MODEL = 'claude-3-5-haiku-latest';
const systemPrompt = `You are a helpful conversational AI voice bot.
Please keep your answers short and to the point; the user will follow up with more questions if needed.
Please reply with unadorned text that can be read aloud to the user using a TTS engine`;

assert(process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY is required');

const service = ({logger, makeService}) => {
  const svc = makeService({path: '/llm-streaming'});

  svc.on('session:new', (session) => {

    session.locals = {
      logger: logger.child({call_sid: session.call_sid}),
      client: new Anthropic({ system: systemPrompt }),
      messages: [],
      assistantResponse: ''
    };
    logger.debug({session}, `new incoming call: ${session.call_sid}`);


    session
      .on('/speech-detected', onSpeechDetected.bind(null, session))
      .on('tts:streaming-event', onStreamingEvent.bind(null, session))
      .on('tts:user_interrupt', onUserInterrupt.bind(null, session))
      .on('close', onClose.bind(null, session))
      .on('error', onError.bind(null, session));

    try {
      session
        .config({
          ttsStream: {
            enable: true,
          },
          bargeIn: {
            enable: true,
            sticky: true,
            minBargeinWordCount: 1,
            actionHook: '/speech-detected',
            input: ['speech']
          }
        })
        .say({text: 'Hi there, how can I help you today?'})
        .send();
    } catch (err) {
      session.locals.logger.info({err}, `Error to responding to incoming call: ${session.call_sid}`);
      session.close();
    }
  });
};

const onSpeechDetected = async(session, event) => {
  const {logger, client} = session.locals;
  const {speech} = event;

  session.reply();

  if (speech?.is_final) {
    const {transcript} = speech.alternatives[0];
    session.locals.messages.push({
      role: 'user',
      content: transcript
    });
    session.locals.user_interrupt = false;

    logger.info({messages:session.locals.messages}, `session ${session.call_sid} making request to Anthropic`);

    const stream = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: session.locals.messages,
      stream: true
    });

    for await (const messageStreamEvent of stream) {
      if (session.locals.user_interrupt) {
        logger.info(`session ${session.call_sid} user interrupted, closing stream`);
        session.locals.messages.push({
          role: 'assistant',
          content: `${session.locals.assistantResponse}...`
        });
        session.locals.assistantResponse = '';
        break;
      }

      logger.info({messageStreamEvent}, `session ${session.call_sid} received message stream event`);

      if (messageStreamEvent.delta?.text) {
        const tokens = messageStreamEvent.delta.text;
        session.locals.assistantResponse += tokens;
        session.sendTtsTokens(tokens)
          .catch((err) => logger.error({err}, 'error sending TTS tokens'));
      }
      else if (messageStreamEvent.type === 'message_stop') {
        logger.info(`session ${session.call_sid} flushing TTS tokens`);
        session.flushTtsTokens();
        session.locals.messages.push({
          role: 'assistant',
          content: session.locals.assistantResponse
        });
        session.locals.assistantResponse = '';
      }
    }
    logger.info(`session ${session.call_sid} completed processing stream`);
  }
};

const onUserInterrupt = (session) => {
  const {logger} = session.locals;
  logger.info(`session ${session.call_sid} received user interrupt, cancel any requests in progress to Anthropic`);
  session.locals.user_interrupt = true;
};

const onStreamingEvent = (session, event) => {
  const {logger} = session.locals;
  logger.info({event}, `session ${session.call_sid} received streaming event`);
};

const onClose = (session, code, reason) => {
  const {logger} = session.locals;
  logger.debug({session, code, reason}, `session ${session.call_sid} closed`);
};

const onError = (session, err) => {
  const {logger} = session.locals;
  logger.info({err}, `session ${session.call_sid} received error`);
};

module.exports = service;
