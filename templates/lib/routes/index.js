module.exports = ({logger, makeService}) => {
  {% if tts %}
  require('./hello-world')({logger, makeService});
  {% endif %}
  {% if echo %}
  require('./echo')({logger, makeService});
  {% endif %}
  {% if chatgpt3 %}
  require('./chat-gpt3')({logger, makeService});
  {% endif %}
};

