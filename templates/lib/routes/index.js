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
  {% if deepgram %}
  require('./deepgram-s2s')({logger, makeService});
  {% endif %}
  {% if streaming %}
  require('./llm-streaming')({logger, makeService});
  {% endif %}
};

