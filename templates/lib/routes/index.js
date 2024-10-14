module.exports = ({logger, makeService}) => {
  {% if tts %}
  require('./hello-world')({logger, makeService});
  {% endif %}
  {% if echo %}
  require('./echo')({logger, makeService});
  {% endif %}
  {% if openai %}
  require('./openai-s2s')({logger, makeService});
  {% endif %}
};

