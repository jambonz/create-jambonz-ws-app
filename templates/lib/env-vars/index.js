const router = require('express').Router();

{% if tts %}
router.use('/hello-world', require('./options-handler'));
{% endif %}
{% if echo %}
router.use('/echo', require('./options-handler'));
{% endif %}
{% if openai %}
router.use('/openai-s2s', require('./options-handler'));
{% endif %}
{% if deepgram %}
router.use('/deepgram-s2s', require('./options-handler'));
{% endif %}
{% if streaming %}
router.use('/llm-streaming', require('./options-handler'));
{% endif %}
module.exports = router;
