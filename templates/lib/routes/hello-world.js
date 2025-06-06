{% if enableEnv %}
const { mergeEnvVarsWithDefaults } = require('@jambonz/node-client-ws');
{% else %}
const text = `<speak>
<prosody volume="loud">Hi there,</prosody> and welcome to jambones! 
jambones is the <sub alias="seapass">CPaaS</sub> designed with the needs
of communication service providers in mind.
This is an example of simple text-to-speech, but there is so much more you can do.
Try us out!
</speak>`;
{% endif %}

const service = ({logger, makeService}) => {
  const svc = makeService({path: '/hello-world'});
  {% if enableEnv %}
  const schema = require('../../app.json');
  {% endif %}

  svc.on('session:new', (session) => {
    {% if enableEnv %}
    const env = mergeEnvVarsWithDefaults(session.env_vars, svc.path, schema);
    {% endif %}
    session.locals = {logger: logger.child({call_sid: session.call_sid})};
    logger.info({session}, `new incoming call: ${session.call_sid}`);

    try {
      session
        .on('close', onClose.bind(null, session))
        .on('error', onError.bind(null, session));

      session
        .pause({length: 1.5})
        {% if enableEnv %}
        .say({text: env.text})
        {% else %}
        .say({text})
        {% endif %}
        .pause({length: 0.5})
        .hangup()
        .send();
    } catch (err) {
      session.locals.logger.info({err}, `Error to responding to incoming call: ${session.call_sid}`);
      session.close();
    }
  });
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
