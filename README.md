# create-jambonz-ws-app 

Usage: npx create-jambonz-ws-app [options] project-name
```
Options:
  -v, --version              display the current version
  -s, --scenario <scenario>  generates a sample websocket app for jambonz (default: "hello-world")
  -h, --help                 display help for command
```

The following scenarios are available:
- hello-world: a simple app that responds to an incoming call using text-to-speech,
- echo: an collect-and-response app that echos caller voice input,
- chat-gpt3: a voicebot that interacts with openai's gpt-3 api (requires openai api key),
- all: generate all of the above scenarios

**Example**: 

```bash
$ npx create-jambonz-ws-app --scenario "hello-world, echo" my-app && cd $_ && node app.js

Creating a new jambonz websocket app in /Users/dhorton/my-app

Installing packages...
{
  "level": 30,
	"time": 1674396724396,
	"pid": 55883,
	"hostname": "MacBook-Pro-3.local",
	"msg": "jambonz websocket server listening at http://localhost:3000"
}
```
