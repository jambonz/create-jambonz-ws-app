# {{ appName }}

This application was created with the [create-jambonz-ws-app](https://www.npmjs.com/package/create-jambonz-ws-app) command.  This documentation was generated at the time when the project was generated and describes the functionality that was initially scaffolded.  Of course, you should feel free to modify or replace this documentation as you build out your own logic.

## Services

Based on the options that you have chosen, this application exposes the following services over a websocket interface:

{% if tts %}
### /hello-world
A simple "hello, world" application using text to speech.
{% endif %}

{% if echo %}
### /echo
A application that prompts the caller for speech, transcribes it and speaks it back along with the recognized confidence factor.
{% endif %}

{% if openai %}
### /openai-s2s
An example application that connects to the OpenAI Realtime API and implements a Voice-AI conversation.  The example shows how to configure the session parameters and gives an example of how to provide function calls, or tools, to the OpenAI assistant.  This example requires an OpenAI API key with permissions for the Real-time API, the key must be provided via the `OPENAI_API_KEY` environment variable.
{% endif %}

