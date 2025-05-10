const assert = require('assert');
const axios = require('axios');

{% if not enableEnv %}
assert(process.env.DEEPGRAM_API_KEY, 'DEEPGRAM_API_KEY env variable is missing');
{% endif %}

const service = ({logger, makeService}) => {
  const svc = makeService({path: '/deepgram-s2s'});
  {% if enableEnv %}
  const schema = require('../../app.json');
  {% endif %}

  svc.on('session:new', (session, path) => {
    {% if enableEnv %}
    const env = mergeEnvVarsWithDefaults(session.env_vars, svc.path, schema);
    {% endif %}
    session.locals = { ...session.locals,
      transcripts: [],
      logger: logger.child({call_sid: session.call_sid})
    };
    session.locals.logger.info({session, path}, `new incoming call: ${session.call_sid}`);

    const apiKey = {% if enableEnv %}env.deepgramApiKey{% else %} process.env.DEEPGRAM_API_KEY{% endif %};
    session
      .on('/event', onEvent.bind(null, session))
      .on('/toolCall', onToolCall.bind(null, session))
      .on('/final', onFinal.bind(null, session))
      .on('close', onClose.bind(null, session))
      .on('error', onError.bind(null, session));

    session
      .answer()
      .pause({length: 1})
      .say({text: 'Hello, how can I help you today?'})
      .llm({
        vendor: 'deepgram',
        model: 'voice-agent',
        auth: {
          apiKey
        },
        actionHook: '/final',
        eventHook: '/event',
        toolHook: '/toolCall',
        events: [
          'all',
        ],
        llmOptions: {
          settingsConfiguration: {
            type: 'SettingsConfiguration',
            agent: {
              listen: {
                model: {% if enableEnv %}env.sttModel{% else %}'nova-3'{% endif %},
              },
              think: {
                model: {% if enableEnv %}env.llmModel{% else %}'gpt-4o-mini'{% endif %},
                provider: {
                  type: {% if enableEnv %}env.llmProvider{% else %}'open_ai'{% endif %},
                },
                instructions: 'Please help the user with their request.',
                functions: [
                  {
                    name: 'get_weather',
                    description: 'Get the weather at a given location',
                    parameters: {
                      type: 'object',
                      properties: {
                        location: {
                          type: 'string',
                          description: 'Location to get the weather from',
                        },
                        scale: {
                          type: 'string',
                          enum: ['fahrenheit', 'celsius'],
                        },
                      },
                      required: ['location', 'scale'],
                    },
                  },
                ]
              }
            }
          }
        }
      })
      .hangup()
      .send();
  });
};

const onFinal = async(session, evt) => {
  const {logger} = session.locals;
  logger.info(`got actionHook: ${JSON.stringify(evt)}`);

  if (['server failure', 'server error'].includes(evt.completion_reason)) {
    if (evt.error.code === 'rate_limit_exceeded') {
      let text = 'Sorry, you have exceeded your open AI rate limits. ';
      const arr = /try again in (\d+)/.exec(evt.error.message);
      if (arr) {
        text += `Please try again in ${arr[1]} seconds.`;
      }
      session
        .say({text});
    }
    else {
      session
        .say({text: 'Sorry, there was an error processing your request.'});
    }
    session.hangup();
  }
  session.reply();
};

const onEvent = async(session, evt) => {
  const {logger} = session.locals;
  logger.info(`got eventHook: ${JSON.stringify(evt)}`);
};

const onToolCall = async(session, evt) => {
  const {logger} = session.locals;
  const {name, args, tool_call_id} = evt;
  const {location, scale} = args;

  logger.info({evt}, `got toolHook for ${name} with tool_call_id ${tool_call_id}`);

  try {
    /* first we need lat and long, then we can get the weather for that location */
    let url = `https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=1&language=en&format=json`;
    let response = await axios.get(url);

    if (!Array.isArray(response.data.results) || 0 == response.data.results.length) {
      throw new Error('location_not_found');
    }
    const {latitude:lat, longitude:lng, name, timezone, population, country} = response.data.results[0];

    logger.info({name, country, lat, lng, timezone, population}, 'got response from geocoding API');

    // eslint-disable-next-line max-len
    url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m&temperature_unit=${scale}`;

    logger.info(`calling weather API with url: ${url}`);
    response = await axios.get(url);
    const weather = response.data;
    logger.info({weather}, 'got response from weather API');

    const data = {
      type: 'FunctionCallResponse',
      function_call_id: tool_call_id,
      output: weather
    };

    session.sendToolOutput(tool_call_id, data);

  } catch (err) {
    logger.info({err}, 'error calling geocoding or weather API');
    session.sendToolOutput(tool_call_id, {error: err});
  }
};

const onClose = (session, code, reason) => {
  const {logger} = session.locals;
  logger.info({code, reason}, `session ${session.call_sid} closed`);
};

const onError = (session, err) => {
  const {logger} = session.locals;
  logger.info({err}, `session ${session.call_sid} received error`);
};

module.exports = service;