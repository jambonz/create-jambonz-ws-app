const service = ({logger, makeService}) => {
  const svc = makeService({path: '/echo'});

  svc.on('session:new', (session) => {
    session.locals = {logger: logger.child({call_sid: session.call_sid})};
    logger.info({session}, `new incoming call: ${session.call_sid}`);

    session
      .on('close', onClose.bind(null, session))
      .on('error', onError.bind(null, session))
      .on('/echo', onSpeechEvent.bind(null, session));

    session
      .pause({length: 1.5})
      .gather({
        say: {text: 'Please say something and we will echo it back to you.'},
        input: ['speech'],
        actionHook: '/echo',
        partialResultHook: '/interimTranscript',
        timeout: 15
      })
      .send();
  });
};

const onSpeechEvent = async(session, evt) => {
  const {logger} = session.locals;
  logger.info(`got speech evt: ${JSON.stringify(evt)}`);

  switch (evt.reason) {
    case 'speechDetected':
      echoSpeech(session, evt);
      break;
    case 'timeout':
      reprompt(session);
      break;
    default:
      session.reply();
      break;
  }
};

const echoSpeech = async(session, evt) => {
  const {transcript, confidence} = evt.speech.alternatives[0];

  session
    .say({text: `You said: ${transcript}.  The confident score was ${confidence.toFixed(2)}`})
    .gather({
      say: {text: 'Say something else.'},
      input: ['speech'],
      actionHook: '/echo'
    })
    .reply();
};

const reprompt = async(session, evt) => {
  session
    .gather({
      say: {text: 'Are you still there?  I didn\'t hear anything.'},
      input: ['speech'],
      actionHook: '/echo'
    })
    .reply();
};

const onClose = (session, code, reason) => {
  const {logger} = session.locals;
  logger.info({session, code, reason}, `session ${session.call_sid} closed`);
};

const onError = (session, err) => {
  const {logger} = session.locals;
  logger.info({err}, `session ${session.call_sid} received error`);
};

module.exports = service;
