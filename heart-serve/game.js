/* ═══════════════════════════════════════════════════════════════
   HeartServe: Love & Ping Pong — game.js
   Dating sim + ping pong arcade  ·  SlayPlay
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── i18n helpers ── */
  var _t = function(key) { return typeof I18N !== 'undefined' ? I18N.t(key) : key; };
  var _td = function(key, fallback) {
    if (typeof I18N === 'undefined') return fallback;
    var val = I18N.t(key);
    return (val && val !== key) ? val : fallback;
  };

  /* ════════════════════════════════════════════════════════════
     CHARACTER DATA
     ════════════════════════════════════════════════════════════ */
  var CHARS = {
    hana: {
      name: 'Hana Takeda',
      title: 'The Fierce Competitor',
      color: '#ff6b35',
      colorLight: '#ffe0d0',
      skinColor: '#fde0c8',
      hairColor: '#e84820',
      hairHighlight: '#ff8050',
      eyeColor: '#e8740c',
      desc: 'Bold, competitive, secretly sweet',
      aiSpeed: 0.38,
      aiReact: 0.06,
      pongStyle: 'aggressive'
    },
    yuki: {
      name: 'Yuki Aoyama',
      title: 'The Gentle Soul',
      color: '#7c4dff',
      colorLight: '#ede0ff',
      skinColor: '#fce8e0',
      hairColor: '#90caf9',
      hairHighlight: '#bbdefb',
      eyeColor: '#7e57c2',
      desc: 'Kind, shy, quietly determined',
      aiSpeed: 0.25,
      aiReact: 0.04,
      pongStyle: 'defensive'
    },
    rin: {
      name: 'Rin Fujimoto',
      title: 'The Chaotic Charmer',
      color: '#00c853',
      colorLight: '#d0ffd8',
      skinColor: '#fde8d0',
      hairColor: '#2e7d32',
      hairHighlight: '#66bb6a',
      eyeColor: '#f9a825',
      desc: 'Playful, witty, surprisingly deep',
      aiSpeed: 0.32,
      aiReact: 0.08,
      pongStyle: 'tricky'
    }
  };
  var CHAR_KEYS = ['hana', 'yuki', 'rin'];
  var TOTAL_DAYS = 14;
  var WIN_SCORE = 5;
  var MAX_AFFECTION = 100;

  /* ════════════════════════════════════════════════════════════
     DIALOGUE DATA  — 7 days × 3 characters × 3 choices
     ════════════════════════════════════════════════════════════ */
  var DIALOGUE = {
    hana: [
      { scene: _td('hsHana1Scene', 'Hana stretches by the ping pong table, eyes sharp.'),
        text: _td('hsHana1Text', "You're the new challenger? Good. I was getting bored beating everyone else."),
        choices: [
          { text: _td('hsHana1C1', "Prepare to lose, champion."), aff: 3, react: _td('hsHana1R1', "Oho? Bold. I like bold."), expr: 'smirk' },
          { text: _td('hsHana1C2', "I'll give it my best shot!"), aff: 1, react: _td('hsHana1R2', "That's... fine, I guess. Just don't cry."), expr: 'neutral' },
          { text: _td('hsHana1C3', "Go easy on me?"), aff: -1, react: _td('hsHana1R3', "*sighs* Where's the fun in that?"), expr: 'annoyed' }
        ]},
      { scene: _td('hsHana2Scene', 'Hana is practicing serves. Her form is flawless.'),
        text: _td('hsHana2Text', "Back for more? Yesterday wasn't enough humiliation?"),
        choices: [
          { text: _td('hsHana2C1', "I've been practicing all night for you."), aff: 3, react: _td('hsHana2R1', "*turns slightly red* F-for the GAME. You practiced for the game."), expr: 'flustered' },
          { text: _td('hsHana2C2', "You're really good. Can you teach me?"), aff: 2, react: _td('hsHana2R2', "*blinks* Teach? I... sure. Get over here."), expr: 'surprised' },
          { text: _td('hsHana2C3', "I just came to watch."), aff: -1, react: _td('hsHana2R3', "Watching is for quitters. Pick up a paddle."), expr: 'annoyed' }
        ]},
      { scene: _td('hsHana3Scene', 'A tournament bracket is posted. You\'re in the same half as Hana.'),
        text: _td('hsHana3Text', "If we both keep winning, we'll face each other in the semis. Don't you dare lose before then."),
        choices: [
          { text: _td('hsHana3C1', "I want to face you more than anything."), aff: 3, react: _td('hsHana3R1', "*face turns red* S-stop saying weird stuff and just WIN!"), expr: 'flustered' },
          { text: _td('hsHana3C2', "I'll try to make it!"), aff: 1, react: _td('hsHana3R2', "Trying isn't winning. Remember that."), expr: 'neutral' },
          { text: _td('hsHana3C3', "What if I lose on purpose?"), aff: -1, react: _td('hsHana3R3', "Then you're dead to me. Only half kidding."), expr: 'annoyed' }
        ]},
      { scene: _td('hsHana4Scene', 'You find Hana alone at the gym, hitting balls against the wall.'),
        text: _td('hsHana4Text', "Oh\u2014 Don't tell anyone you saw me practicing alone. It ruins the 'natural talent' image."),
        choices: [
          { text: _td('hsHana4C1', "Your secret is safe with me."), aff: 3, react: _td('hsHana4R1', "...Thanks. You're weirdly trustworthy, you know that?"), expr: 'happy' },
          { text: _td('hsHana4C2', "Why hide it? Hard work is cool."), aff: 2, react: _td('hsHana4R2', "You think so? ...Nobody's ever said that to me."), expr: 'surprised' },
          { text: _td('hsHana4C3', "Haha, so you DO have to practice!"), aff: -1, react: _td('hsHana4R3', "Get. Out. NOW."), expr: 'annoyed' }
        ]},
      { scene: _td('hsHana5Scene', 'Hana shows up with a brand-new paddle. She looks fired up.'),
        text: _td('hsHana5Text', "I got a new paddle just for you. ...That came out wrong. I mean to BEAT you."),
        choices: [
          { text: _td('hsHana5C1', "Is that your way of saying I'm special?"), aff: 3, react: _td('hsHana5R1', "I\u2014 NO! It's\u2014 you're\u2014 ugh, just PLAY!"), expr: 'flustered' },
          { text: _td('hsHana5C2', "Cool paddle! Custom grip?"), aff: 1, react: _td('hsHana5R2', "...Yeah. Thanks for noticing."), expr: 'happy' },
          { text: _td('hsHana5C3', "You didn't have to do that."), aff: 0, react: _td('hsHana5R3', "I KNOW. I WANTED to. There's a difference."), expr: 'neutral' }
        ]},
      { scene: _td('hsHana6Scene', 'Hana is sitting outside, unusually quiet.'),
        text: _td('hsHana6Text', "Everyone thinks I only care about winning. But the truth is... I just don't know how else to connect with people."),
        choices: [
          { text: _td('hsHana6C1', "You're connecting with me right now."), aff: 3, react: _td('hsHana6R1', "...Yeah. I guess I am. *small smile*"), expr: 'happy' },
          { text: _td('hsHana6C2', "Winning IS pretty cool though."), aff: 1, react: _td('hsHana6R2', "Hah. Way to lighten the mood, dork."), expr: 'smirk' },
          { text: _td('hsHana6C3', "You should try being nicer."), aff: -1, react: _td('hsHana6R3', "Wow. Groundbreaking advice. Thanks."), expr: 'annoyed' }
        ]},
      { scene: _td('hsHana7Scene', 'Final day. Hana is waiting, arms crossed but eyes soft.'),
        text: _td('hsHana7Text', "Last match of the season. Whatever happens... I'm glad it's you on the other side of the table."),
        choices: [
          { text: _td('hsHana7C1', "Me too. Let's make it legendary."), aff: 3, react: _td('hsHana7R1', "Legendary. I love that. Let's GO!"), expr: 'happy' },
          { text: _td('hsHana7C2', "Win or lose, I had fun."), aff: 2, react: _td('hsHana7R2', "...Same. Don't tell anyone I said that."), expr: 'flustered' },
          { text: _td('hsHana7C3', "I'm gonna crush you."), aff: 1, react: _td('hsHana7R3', "HA! NOW you find your competitive side?!"), expr: 'smirk' }
        ]},
      { scene: 'Hana is at the vending machine, staring at it like an opponent.',
        text: "I can't decide between coffee and tea. Why is this harder than a championship match?",
        choices: [
          { text: "I'll pick for you.", aff: 3, react: "...Nobody's ever done that. I hate that I like it.", expr: 'flustered' },
          { text: "Coffee. You need the fire.", aff: 2, react: "You know me too well. That's dangerous.", expr: 'smirk' },
          { text: "Just get both.", aff: 0, react: "That's... actually genius. Why didn't I think of that?", expr: 'surprised' }
        ]},
      { scene: 'Hana shows you a photo on her phone — her as a kid, holding a tiny paddle.',
        text: "Don't you DARE laugh. I was six. And already better than most adults.",
        choices: [
          { text: "You were adorable. Still are.", aff: 3, react: "I am NOT adorable! I am TERRIFYING!", expr: 'flustered' },
          { text: "The competitive spirit was already there!", aff: 2, react: "Born champion. Written in the DNA.", expr: 'happy' },
          { text: "Your hair was so different!", aff: 0, react: "Focus on the PADDLE, not the HAIR.", expr: 'annoyed' }
        ]},
      { scene: 'A thunderstorm outside. Hana flinches at lightning, then pretends she didn\'t.',
        text: "I'm not scared. I just... react to loud things. Strategically.",
        choices: [
          { text: "You can hold my arm if you want.", aff: 3, react: "*grabs arm immediately* This means NOTHING.", expr: 'flustered' },
          { text: "Thunder is just sound. No danger.", aff: 1, react: "I KNOW that. Doesn't stop the flinching.", expr: 'annoyed' },
          { text: "Want to go inside?", aff: 2, react: "...Yes. But only because the tables are inside.", expr: 'happy' }
        ]},
      { scene: 'Hana has made a training schedule. It has your name on it.',
        text: "I made us a training plan. Color-coded. Don't read anything into the heart stickers, my sister put those there.",
        choices: [
          { text: "Your sister has great taste.", aff: 3, react: "She's DEAD to me. ...She'd like you though.", expr: 'flustered' },
          { text: "This is really detailed. Impressive.", aff: 2, react: "Of course it is. I don't do things halfway.", expr: 'happy' },
          { text: "Training on weekends too?", aff: 0, react: "Winners don't take days off.", expr: 'neutral' }
        ]},
      { scene: 'Hana is unusually quiet, fidgeting with her headband.',
        text: "Do you think... I push people away? My teammates said something and I can't stop thinking about it.",
        choices: [
          { text: "You let me in. That counts for everything.", aff: 3, react: "...You're the exception. Don't know why. Don't want to question it.", expr: 'happy' },
          { text: "You can be intense. But it's part of your charm.", aff: 2, react: "Charm? Me? ...I'll take it.", expr: 'flustered' },
          { text: "Maybe tone it down sometimes?", aff: -1, react: "Wow. Adding you to the list of people who said that.", expr: 'annoyed' }
        ]},
      { scene: 'Hana is waiting at your usual spot. She brought two paddles.',
        text: "I carved our initials into the handles. For... identification purposes ONLY.",
        choices: [
          { text: "Matching paddles? We're basically a team now.", aff: 3, react: "A team... yeah. The best team.", expr: 'happy' },
          { text: "This is really thoughtful, Hana.", aff: 2, react: "Don't tell anyone I have thoughts. Ruins the brand.", expr: 'smirk' },
          { text: "Cool carving work!", aff: 1, react: "Thanks. Cut myself twice. Worth it.", expr: 'neutral' }
        ]},
      { scene: 'Last day of the extended season. Hana is standing tall, eyes blazing.',
        text: "Fourteen days. You survived fourteen days of me. Nobody's ever done that.",
        choices: [
          { text: "I'd survive fourteen more. Fourteen hundred.", aff: 3, react: "*eyes glisten* ...Okay. You win. Not the match. Everything else.", expr: 'happy' },
          { text: "You made every day worth it.", aff: 2, react: "Stop it. I'm trying to be tough for our last match.", expr: 'flustered' },
          { text: "It was quite a ride.", aff: 1, react: "Understatement of the century. Let's finish this.", expr: 'smirk' }
        ]}
    ],
    yuki: [
      { scene: _td('hsYuki1Scene', 'Yuki is reading near the ping pong table. She startles.'),
        text: _td('hsYuki1Text', "O-oh! Sorry, am I in the way? I like reading here because the rhythm of the ball is... soothing..."),
        choices: [
          { text: _td('hsYuki1C1', "That's really poetic, actually."), aff: 3, react: _td('hsYuki1R1', "*blushes* Y-you think so? Nobody's ever said that..."), expr: 'flustered' },
          { text: _td('hsYuki1C2', "Wanna play a round?"), aff: 1, react: _td('hsYuki1R2', "M-me? I'm not very good, but... okay..."), expr: 'surprised' },
          { text: _td('hsYuki1C3', "You're kind of in the way."), aff: -1, react: _td('hsYuki1R3', "I'm so sorry! I'll move\u2014 I'm always in the way..."), expr: 'sad' }
        ]},
      { scene: _td('hsYuki2Scene', 'Yuki has a stack of books about ping pong technique.'),
        text: _td('hsYuki2Text', "I-I read three books about paddle grip last night... I wanted to be less terrible for you\u2014 I MEAN, for the game!"),
        choices: [
          { text: _td('hsYuki2C1', "You studied for me? That's adorable."), aff: 3, react: _td('hsYuki2R1', "A-a-adorable?! I just... I wanted to improve!"), expr: 'flustered' },
          { text: _td('hsYuki2C2', "That's real dedication!"), aff: 2, react: _td('hsYuki2R2', "Th-thank you... knowledge is comfort for me."), expr: 'happy' },
          { text: _td('hsYuki2C3', "You could just practice instead of reading."), aff: -1, react: _td('hsYuki2R3', "O-oh... you're probably right... sorry..."), expr: 'sad' }
        ]},
      { scene: _td('hsYuki3Scene', 'Yuki manages a decent serve for the first time.'),
        text: _td('hsYuki3Text', "Did you see that?! I\u2014 oh, sorry for shouting... but did you SEE that serve?!"),
        choices: [
          { text: _td('hsYuki3C1', "That was AMAZING! Do it again!"), aff: 3, react: _td('hsYuki3R1', "Y-you really think so?! Okay\u2014 watch closely!"), expr: 'happy' },
          { text: _td('hsYuki3C2', "Nice serve!"), aff: 1, react: _td('hsYuki3R2', "Thank you! The book said to follow through!"), expr: 'happy' },
          { text: _td('hsYuki3C3', "It was okay."), aff: -1, react: _td('hsYuki3R3', "O-oh... okay is... better than terrible, I suppose..."), expr: 'sad' }
        ]},
      { scene: _td('hsYuki4Scene', 'It\'s raining. Yuki is by the window, looking dreamy.'),
        text: _td('hsYuki4Text', "Do you ever wonder if raindrops are playing their own game? Bouncing off windows like tiny ping pong balls..."),
        choices: [
          { text: _td('hsYuki4C1', "I love how you see the world."), aff: 3, react: _td('hsYuki4R1', "*turns bright red* I... no one's ever... thank you..."), expr: 'flustered' },
          { text: _td('hsYuki4C2', "That's a fun way to think about it."), aff: 2, react: _td('hsYuki4R2', "It helps me not feel so nervous about everything."), expr: 'happy' },
          { text: _td('hsYuki4C3', "It's just rain."), aff: -1, react: _td('hsYuki4R3', "R-right... of course... I say weird things..."), expr: 'sad' }
        ]},
      { scene: _td('hsYuki5Scene', 'Yuki approaches you first for once.'),
        text: _td('hsYuki5Text', "U-um! I signed up for the tournament! I know I'll probably lose but... you made me want to try."),
        choices: [
          { text: _td('hsYuki5C1', "I'm so proud of you!"), aff: 3, react: _td('hsYuki5R1', "*tears up* Th-that means everything... truly..."), expr: 'happy' },
          { text: _td('hsYuki5C2', "Good luck!"), aff: 1, react: _td('hsYuki5R2', "Thank you! I'll need it..."), expr: 'happy' },
          { text: _td('hsYuki5C3', "Are you sure? It might be embarrassing."), aff: -1, react: _td('hsYuki5R3', "I... maybe you're right... I'll withdraw..."), expr: 'sad' }
        ]},
      { scene: _td('hsYuki6Scene', 'After a long day, Yuki invites you to the rooftop.'),
        text: _td('hsYuki6Text', "I come here when I'm anxious... The stars make my problems feel small. I've never brought anyone here before."),
        choices: [
          { text: _td('hsYuki6C1', "I'm honored you'd share this with me."), aff: 3, react: _td('hsYuki6R1', "You make me feel brave enough to share things..."), expr: 'happy' },
          { text: _td('hsYuki6C2', "It's a nice view."), aff: 1, react: _td('hsYuki6R2', "It is... I'm glad you like it."), expr: 'happy' },
          { text: _td('hsYuki6C3', "I'm scared of heights, actually."), aff: 0, react: _td('hsYuki6R3', "Oh! W-we can go back down! I'm sorry!"), expr: 'surprised' }
        ]},
      { scene: _td('hsYuki7Scene', 'Yuki arrives with unusual confidence. Something is different.'),
        text: _td('hsYuki7Text', "I won my first tournament match. I lost the second one, but... I won one. Because you believed in me."),
        choices: [
          { text: _td('hsYuki7C1', "You did that yourself. I just cheered."), aff: 3, react: _td('hsYuki7R1', "No... you did so much more than cheer. You saw me."), expr: 'happy' },
          { text: _td('hsYuki7C2', "Congrats, Yuki!"), aff: 2, react: _td('hsYuki7R2', "Thank you! One more match together?"), expr: 'happy' },
          { text: _td('hsYuki7C3', "See? Reading paid off."), aff: 1, react: _td('hsYuki7R3', "Heh... maybe a little of both."), expr: 'happy' }
        ]},
      { scene: 'Yuki is organizing her book bag, humming a tune.',
        text: "I-I started humming in public! I never used to do that... You make me forget to be self-conscious.",
        choices: [
          { text: "Your humming is beautiful.", aff: 3, react: "*covers mouth* Y-you heard?! Oh no... oh no oh no...", expr: 'flustered' },
          { text: "That's real progress!", aff: 2, react: "It is! Small steps... but they feel big.", expr: 'happy' },
          { text: "What song was it?", aff: 1, react: "I-it's embarrassing... it's from an anime...", expr: 'flustered' }
        ]},
      { scene: 'Yuki has brought a small sketchbook filled with ping pong doodles.',
        text: "I-I drew all our matches from memory... Is that creepy? Please say it's not creepy.",
        choices: [
          { text: "It's the most precious thing I've ever seen.", aff: 3, react: "*clutches sketchbook* Y-you really think so...?", expr: 'flustered' },
          { text: "These are really good!", aff: 2, react: "I-I've been practicing... like you taught me to practice ping pong!", expr: 'happy' },
          { text: "A little intense, but cute.", aff: 0, react: "I-I'll burn it! No wait— I worked hard on it...", expr: 'sad' }
        ]},
      { scene: 'Yuki is standing in the rain without an umbrella, smiling up at the sky.',
        text: "The rain sounds like applause. Like the sky is cheering for us.",
        choices: [
          { text: "Dance with me in it.", aff: 3, react: "*takes your hand* I-I've never danced before... but okay!", expr: 'happy' },
          { text: "You'll catch a cold!", aff: 1, react: "W-worth it. Some moments need to be felt.", expr: 'happy' },
          { text: "That's a beautiful thought.", aff: 2, react: "Everything is beautiful when I'm around you...", expr: 'flustered' }
        ]},
      { scene: 'Yuki brings you homemade cookies wrapped in a handkerchief.',
        text: "I-I baked these! They're not perfect... the third batch was okay... I threw away the first two.",
        choices: [
          { text: "Anything you make is perfect.", aff: 3, react: "*turns bright red* Y-you haven't even tried them yet!", expr: 'flustered' },
          { text: "Three batches? You're dedicated!", aff: 2, react: "I wanted them to be special... for a special person...", expr: 'flustered' },
          { text: "Let me try one right now!", aff: 1, react: "*watches anxiously* W-well?! How is it?!", expr: 'surprised' }
        ]},
      { scene: 'Yuki is reading by the window. She doesn\'t notice you at first.',
        text: "O-oh! I was reading a romance novel... The main character reminds me of... n-nevermind!",
        choices: [
          { text: "Reminds you of someone you know?", aff: 3, react: "*hides behind book* M-maybe! The one who plays ping pong!", expr: 'flustered' },
          { text: "What's the book about?", aff: 1, react: "Two people who... find each other through... a sport...", expr: 'flustered' },
          { text: "I won't pry.", aff: 0, react: "...Thank you. B-but I kind of wanted you to pry...", expr: 'sad' }
        ]},
      { scene: 'Yuki hands you a folded paper crane.',
        text: "They say if you fold a thousand cranes, your wish comes true. This is number 467. I started the day I met you.",
        choices: [
          { text: "What are you wishing for?", aff: 3, react: "*whispers* I think you know... *blushes furiously*", expr: 'flustered' },
          { text: "You've folded 467 cranes?!", aff: 2, react: "E-each one is a moment I wanted to remember with you.", expr: 'happy' },
          { text: "That's beautiful, Yuki.", aff: 2, react: "You're the reason I started believing wishes could come true.", expr: 'happy' }
        ]},
      { scene: 'Final extended day. Yuki stands tall — taller than you\'ve ever seen her.',
        text: "Fourteen days ago, I couldn't even hold a paddle without shaking. Now... I'm only shaking because of you.",
        choices: [
          { text: "You've become the bravest person I know.", aff: 3, react: "*tears streaming but smiling wide* Because you showed me how!", expr: 'happy' },
          { text: "Let's make this last match count.", aff: 2, react: "Every match with you counts. Every single one.", expr: 'happy' },
          { text: "I'm so proud of who you've become.", aff: 2, react: "I became this... because someone finally believed in me.", expr: 'flustered' }
        ]}
    ],
    rin: [
      { scene: _td('hsRin1Scene', 'Rin is doing trick shots, bouncing the ball off the ceiling.'),
        text: _td('hsRin1Text', "Ooh~ A new face! Rate my trick shot. Scale of 1 to 'marry me.'"),
        choices: [
          { text: _td('hsRin1C1', "Solid 'marry me.'"), aff: 3, react: _td('hsRin1R1', "Ahaha! Bold! I like you already~"), expr: 'happy' },
          { text: _td('hsRin1C2', "That was pretty impressive!"), aff: 1, react: _td('hsRin1R2', "Just impressive? I'm offended~"), expr: 'smirk' },
          { text: _td('hsRin1C3', "Shouldn't you hit it over the net?"), aff: 0, react: _td('hsRin1R3', "Rules are for people without style, darling~"), expr: 'smirk' }
        ]},
      { scene: _td('hsRin2Scene', 'Rin has placed random obstacles on the ping pong table.'),
        text: _td('hsRin2Text', "Welcome to EXTREME ping pong! I added some... architectural improvements. Scared~?"),
        choices: [
          { text: _td('hsRin2C1', "I'm terrified and excited. Let's go."), aff: 3, react: _td('hsRin2R1', "A kindred spirit of chaos! Perfection~!"), expr: 'happy' },
          { text: _td('hsRin2C2', "Is this even legal?"), aff: 1, react: _td('hsRin2R2', "Legal? Where's the fun in legal~?"), expr: 'smirk' },
          { text: _td('hsRin2C3', "Can we play normal ping pong?"), aff: -1, react: _td('hsRin2R3', "Booooring. You're no fun."), expr: 'annoyed' }
        ]},
      { scene: _td('hsRin3Scene', 'Rin pulls you aside with a mischievous grin.'),
        text: _td('hsRin3Text', "Let's make a bet~ If I win, you do whatever I say. If YOU win... I'll tell you a secret."),
        choices: [
          { text: _td('hsRin3C1', "You're on. I want that secret."), aff: 3, react: _td('hsRin3R1', "Motivated! I love when the stakes are high~"), expr: 'happy' },
          { text: _td('hsRin3C2', "What kind of secret?"), aff: 2, react: _td('hsRin3R2', "Wouldn't YOU like to know~ That's the whole point."), expr: 'smirk' },
          { text: _td('hsRin3C3', "That sounds risky..."), aff: -1, react: _td('hsRin3R3', "Tch. Playing it safe is the biggest risk."), expr: 'annoyed' }
        ]},
      { scene: _td('hsRin4Scene', 'You catch Rin alone, without her usual grin. She looks tired.'),
        text: _td('hsRin4Text', "Oh\u2014 Hey! I was just\u2014 *puts on a smile* \u2014planning my next prank! What's up?"),
        choices: [
          { text: _td('hsRin4C1', "You don't have to perform for me."), aff: 3, react: _td('hsRin4R1', "...How do you always see through me?"), expr: 'surprised' },
          { text: _td('hsRin4C2', "Are you okay?"), aff: 2, react: _td('hsRin4R2', "...I will be. Thanks for noticing."), expr: 'happy' },
          { text: _td('hsRin4C3', "What prank?"), aff: 0, react: _td('hsRin4R3', "Haha, wouldn't you like to know~ *deflects*"), expr: 'smirk' }
        ]},
      { scene: _td('hsRin5Scene', 'Rin finds you and sits unusually close.'),
        text: _td('hsRin5Text', "Everyone thinks I'm just the class clown. But sometimes I wonder if anyone would notice if the jokes stopped."),
        choices: [
          { text: _td('hsRin5C1', "I'd notice. In a heartbeat."), aff: 3, react: _td('hsRin5R1', "...You mean that, don't you? I can tell."), expr: 'happy' },
          { text: _td('hsRin5C2', "Your jokes are great though!"), aff: 1, react: _td('hsRin5R2', "Thanks. But that's not what I meant."), expr: 'neutral' },
          { text: _td('hsRin5C3', "People love you for more than jokes."), aff: 2, react: _td('hsRin5R3', "Do they? Or do they love the character I play?"), expr: 'surprised' }
        ]},
      { scene: _td('hsRin6Scene', 'Rin teaches you her signature spin serve.'),
        text: _td('hsRin6Text', "The trick is in the wrist~ Here, let me show you... *grabs your hand* Oops, too forward~?"),
        choices: [
          { text: _td('hsRin6C1', "Not forward enough."), aff: 3, react: _td('hsRin6R1', "OH? Where was this energy on day one~?!"), expr: 'flustered' },
          { text: _td('hsRin6C2', "Y-your hand is warm."), aff: 2, react: _td('hsRin6R2', "Aww, are you flustered? That's MY job~!"), expr: 'smirk' },
          { text: _td('hsRin6C3', "Just show me the technique."), aff: -1, react: _td('hsRin6R3', "All business? Fine fine... *pout*"), expr: 'annoyed' }
        ]},
      { scene: _td('hsRin7Scene', 'Last day. Rin is waiting with uncharacteristic seriousness.'),
        text: _td('hsRin7Text', "Last day, huh? I wrote you something. Don't read it until after our match. Promise?"),
        choices: [
          { text: _td('hsRin7C1', "I promise. This means a lot."), aff: 3, react: _td('hsRin7R1', "...Good. Now let's play, before I get sappy."), expr: 'happy' },
          { text: _td('hsRin7C2', "What is it?"), aff: 1, react: _td('hsRin7R2', "You'll see~ Some things are worth waiting for."), expr: 'smirk' },
          { text: _td('hsRin7C3', "You? Writing something serious?"), aff: -1, react: _td('hsRin7R3', "I CAN be serious! ...Sometimes. Shut up."), expr: 'annoyed' }
        ]},
      { scene: 'Rin is wearing a ridiculous hat shaped like a ping pong ball.',
        text: "Don't ask where I got it. The story involves a bet, a raccoon, and a 24-hour convenience store.",
        choices: [
          { text: "I need to hear that story immediately.", aff: 3, react: "It starts with 'I should NOT have done that' and ends with a hat~", expr: 'happy' },
          { text: "It suits you, honestly.", aff: 2, react: "Everything suits me. But especially chaos hats.", expr: 'smirk' },
          { text: "Please take that off.", aff: -1, react: "NEVER. This hat is my soul now.", expr: 'annoyed' }
        ]},
      { scene: 'Rin is teaching younger students trick shots. She looks genuinely happy.',
        text: "Oh! Caught me being a good person. Quick, someone call the press~",
        choices: [
          { text: "The mask slips again. You're actually wonderful.", aff: 3, react: "...Stop that. I have a reputation to destroy— I mean maintain.", expr: 'flustered' },
          { text: "You're a great teacher!", aff: 2, react: "The secret is 90% chaos, 10% actual technique.", expr: 'happy' },
          { text: "Can you teach me too?", aff: 1, react: "Private lessons? My my~ How forward.", expr: 'smirk' }
        ]},
      { scene: 'Rin pulls out two matching friendship bracelets made of ping pong net string.',
        text: "Made these from the net we broke that one time. Recycling! Friendship! Crime evidence disposal!",
        choices: [
          { text: "I'm wearing this forever.", aff: 3, react: "...Forever is a long time. I like long times with you.", expr: 'flustered' },
          { text: "We make a great team of chaos.", aff: 2, react: "The BEST team. Agents of beautiful destruction~", expr: 'happy' },
          { text: "We broke a net?", aff: 0, react: "Details, details~ Focus on the BRACELET.", expr: 'smirk' }
        ]},
      { scene: 'Rin is uncharacteristically sitting still, watching the sunset.',
        text: "I used to think stillness was boring. But sitting still with you... it's the loudest my heart has ever been.",
        choices: [
          { text: "Mine too.", aff: 3, react: "*leans against you* ...Don't move. This is perfect.", expr: 'happy' },
          { text: "That was surprisingly poetic.", aff: 2, react: "I contain multitudes! And also snacks. Want some?", expr: 'smirk' },
          { text: "Are you feeling okay?", aff: 0, react: "Better than okay. For once, I'm not performing.", expr: 'happy' }
        ]},
      { scene: 'Rin has organized a mini ping pong festival. There are balloons everywhere.',
        text: "I may have gone overboard. But go big or go home, and I never want to go home when you're here~",
        choices: [
          { text: "You did all this for us?", aff: 3, react: "For you. The 'us' part is the bonus I was hoping for.", expr: 'flustered' },
          { text: "This is amazing!", aff: 2, react: "You should see the balloon budget. It's... significant.", expr: 'happy' },
          { text: "Overboard is your middle name.", aff: 1, react: "Rin 'Overboard' Fujimoto. Has a ring to it~", expr: 'smirk' }
        ]},
      { scene: 'Rin is reading the note she wrote you. She hasn\'t given it to you yet.',
        text: "I keep rewriting this stupid note. Seven drafts. Nothing captures what you— um. Hi. Didn't see you there.",
        choices: [
          { text: "Just tell me. Forget the note.", aff: 3, react: "...You make me want to be real. That's terrifying. And wonderful.", expr: 'flustered' },
          { text: "Take your time. I'll wait.", aff: 2, react: "You always wait for me. Nobody else does that.", expr: 'happy' },
          { text: "Draft number 8?", aff: 1, react: "Draft 8 just says 'I like you' 47 times. It's honest at least.", expr: 'flustered' }
        ]},
      { scene: 'Final extended day. Rin stands without her usual pose. Just... herself.',
        text: "Fourteen days. Fourteen versions of me. But you liked all of them. Even the real one.",
        choices: [
          { text: "Especially the real one.", aff: 3, react: "...Then the real one is all yours. No tricks. No act. Just Rin.", expr: 'happy' },
          { text: "Every version of you is the real one.", aff: 2, react: "How do you always know exactly what to say? It's unfair.", expr: 'flustered' },
          { text: "Let's make this last day count.", aff: 1, react: "Every day with you counted. This one just counts... louder.", expr: 'happy' }
        ]}
    ]
  };

  /* Post-match reactions per character */
  var MATCH_REACTIONS = {
    hana: {
      perfect: _td('hsHanaPerfect', "Okay... OKAY! That was incredible. I'm not even mad. ...Much."),
      nice: _td('hsHanaNice', "Not bad. You actually made me sweat a little."),
      close: _td('hsHanaClose', "A close one! You're getting dangerous."),
      loss: _td('hsHanaLoss', "Ha! Better luck next time, rookie."),
      bad_loss: _td('hsHanaBadLoss', "...That was painful to watch. We need to train you.")
    },
    yuki: {
      perfect: _td('hsYukiPerfect', "W-wow! You're like a ping pong wizard! That was amazing!"),
      nice: _td('hsYukiNice', "You played so well! I learned a lot watching you!"),
      close: _td('hsYukiClose', "Th-that was so intense! My heart is still racing..."),
      loss: _td('hsYukiLoss', "I-I won? Really? Oh my gosh... thank you for playing!"),
      bad_loss: _td('hsYukiBadLoss', "I'm sorry... that must have been frustrating. Want to practice together?")
    },
    rin: {
      perfect: _td('hsRinPerfect', "Well well WELL~ Looks like I've been outplayed. How delicious~"),
      nice: _td('hsRinNice', "Not bad, not bad~ You've earned my respect... and that's rare."),
      close: _td('hsRinClose', "Ooh, a nail-biter! My favorite kind of match~"),
      loss: _td('hsRinLoss', "Hehe~ Looks like the trickster wins today. Better luck next time~"),
      bad_loss: _td('hsRinBadLoss', "Oh honey... that was rough. Let me teach you my ways~")
    }
  };

  /* ════════════════════════════════════════════════════════════
     FOLLOW-UP DIALOGUE — 2 extra conversation beats per day
     ════════════════════════════════════════════════════════════ */
  var FOLLOWUPS = {
    hana: [
      [{ text: _td('hsHana1FU1Text', "You know, most people flinch when I serve. You didn't."), choices: [
          { text: _td('hsHana1FU2Text', "I was too focused on you to flinch."), aff: 2, react: "On me?! I mean\u2014 on my FORM. Right.", expr: 'flustered' },
          { text: _td('hsHana1FU3Text', "I've got nerves of steel."), aff: 1, react: "We'll see about that.", expr: 'smirk' }]},
       { text: _td('hsHana1FU4Text', "Ready to put your money where your mouth is?"), choices: [
          { text: _td('hsHana1FU5Text', "Always."), aff: 1, react: "Good answer.", expr: 'smirk' },
          { text: _td('hsHana1FU6Text', "Only if you promise a rematch."), aff: 2, react: "Ha! Already planning ahead. I respect that.", expr: 'happy' }]}],
      [{ text: _td('hsHana2FU1Text', "Your backhand is terrible, by the way. Want me to fix it?"), choices: [
          { text: _td('hsHana2FU2Text', "Yes please, coach."), aff: 2, react: "*adjusts your grip* There. ...Your hand is warm.", expr: 'flustered' },
          { text: _td('hsHana2FU3Text', "My backhand is fine!"), aff: 0, react: "It's really not. But okay.", expr: 'annoyed' }]},
       { text: _td('hsHana2FU4Text', "I don't usually offer to help people, you know."), choices: [
          { text: _td('hsHana2FU5Text', "I feel special."), aff: 2, react: "Don't let it go to your head.", expr: 'smirk' },
          { text: _td('hsHana2FU6Text', "Why me?"), aff: 1, react: "...Good question. Next topic.", expr: 'flustered' }]}],
      [{ text: _td('hsHana3FU1Text', "I heard you've been asking about me. Cute."), choices: [
          { text: _td('hsHana3FU2Text', "Guilty. I wanted to know everything."), aff: 3, react: "*ears turn red* E-everything?!", expr: 'flustered' },
          { text: _td('hsHana3FU3Text', "Just doing research on my opponent."), aff: 1, react: "Smart. Know your enemy.", expr: 'smirk' }]},
       { text: _td('hsHana3FU4Text', "Ask me anything. One question. Go."), choices: [
          { text: _td('hsHana3FU5Text', "What makes you happy?"), aff: 2, react: "...This. Right now. Don't make it weird.", expr: 'happy' },
          { text: _td('hsHana3FU6Text', "What's your win record?"), aff: 0, react: "147-3. The three haunt me.", expr: 'neutral' }]}],
      [{ text: _td('hsHana4FU1Text', "I brought an extra water bottle. For you. Don't read into it."), choices: [
          { text: _td('hsHana4FU2Text', "Too late, I'm reading into it."), aff: 2, react: "UGH. You're impossible.", expr: 'flustered' },
          { text: _td('hsHana4FU3Text', "Thanks, Hana."), aff: 1, react: "...You're welcome. Whatever.", expr: 'happy' }]},
       { text: _td('hsHana4FU4Text', "My sister says I talk about you too much. She's wrong."), choices: [
          { text: _td('hsHana4FU5Text', "What do you say about me?"), aff: 2, react: "NOTHING. She's LYING. Let's play.", expr: 'flustered' },
          { text: _td('hsHana4FU6Text', "Tell her I said hi."), aff: 1, react: "Absolutely not.", expr: 'annoyed' }]}],
      [{ text: _td('hsHana5FU1Text', "Remember when I said I only care about winning?"), choices: [
          { text: _td('hsHana5FU2Text', "That was clearly a lie."), aff: 2, react: "...Yeah. It was.", expr: 'happy' },
          { text: _td('hsHana5FU3Text', "People change."), aff: 1, react: "Shut up. Let's play before I get sappy.", expr: 'flustered' }]},
       { text: _td('hsHana5FU4Text', "After this match, wanna grab food? I know a place."), choices: [
          { text: _td('hsHana5FU5Text', "Like a date?"), aff: 3, react: "Like a\u2014 I said FOOD. It's just FOOD.", expr: 'flustered' },
          { text: _td('hsHana5FU6Text', "Sure, I'm starving."), aff: 1, react: "Cool. Casual. No big deal. Let's go.", expr: 'happy' }]}],
      [{ text: _td('hsHana6FU1Text', "I couldn't sleep last night. Kept thinking about... the tournament."), choices: [
          { text: _td('hsHana6FU2Text', "Just the tournament?"), aff: 2, react: "...Mostly.", expr: 'flustered' },
          { text: _td('hsHana6FU3Text', "Nervous?"), aff: 1, react: "Me? Never. ...Okay, maybe a little.", expr: 'neutral' }]},
       { text: _td('hsHana6FU4Text', "If I win the whole thing, I'm dedicating it to... someone."), choices: [
          { text: _td('hsHana6FU5Text', "To me?"), aff: 2, react: "DON'T FLATTER YOURSELF. ...But also don't not.", expr: 'flustered' },
          { text: _td('hsHana6FU6Text', "Your family?"), aff: 1, react: "Yeah. Them too.", expr: 'happy' }]}],
      [{ text: _td('hsHana7FU1Text', "Whatever happens today... I need you to know something."), choices: [
          { text: _td('hsHana7FU2Text', "I'm listening."), aff: 2, react: "You always are. That's what I need you to know.", expr: 'happy' },
          { text: _td('hsHana7FU3Text', "You're scaring me."), aff: 1, react: "Ha. The great Hana Takeda, scary. ...Sorry.", expr: 'smirk' }]},
       { text: _td('hsHana7FU4Text', "One more rally. Just you and me. No score."), choices: [
          { text: _td('hsHana7FU5Text', "For fun?"), aff: 2, react: "For us.", expr: 'happy' },
          { text: _td('hsHana7FU6Text', "You're going soft, Takeda."), aff: 1, react: "Tell anyone and you're dead.", expr: 'smirk' }]}],
      [{ text: "I keep replaying our first match in my head.", choices: [
          { text: "Nostalgic already?", aff: 2, react: "For you? ...Maybe.", expr: 'flustered' },
          { text: "You've gotten so much better.", aff: 1, react: "So have you. That's the problem.", expr: 'smirk' }]},
       { text: "Want to see my secret practice spot?", choices: [
          { text: "I'd follow you anywhere.", aff: 2, react: "You already do. It's annoyingly cute.", expr: 'flustered' },
          { text: "Lead the way.", aff: 1, react: "Try to keep up.", expr: 'happy' }]}],
      [{ text: "My mom wants to meet 'the person I keep talking about.'", choices: [
          { text: "You talk about me to your MOM?", aff: 2, react: "She EAVESDROPPED. I didn't TELL her.", expr: 'flustered' },
          { text: "I'd love to meet her.", aff: 2, react: "She'd either love you or challenge you. Possibly both.", expr: 'happy' }]},
       { text: "If I gave you a nickname, would you use it?", choices: [
          { text: "Only if I get to nickname you too.", aff: 2, react: "...Ace. Because you're my ace.", expr: 'flustered' },
          { text: "Depends on the nickname.", aff: 1, react: "Fair. I'll workshop it.", expr: 'smirk' }]}],
      [{ text: "The rain makes me want to stay inside. With you.", choices: [
          { text: "Best rainy day plan ever.", aff: 2, react: "...Yeah. It really is.", expr: 'happy' },
          { text: "We could practice inside.", aff: 1, react: "Always about practice. But... I like that about you.", expr: 'smirk' }]},
       { text: "I saved your water bottle cap. Don't ask why.", choices: [
          { text: "That's weirdly romantic.", aff: 2, react: "It's NOT romantic! It's... evidence.", expr: 'flustered' },
          { text: "I won't ask.", aff: 1, react: "Good. Because the answer is embarrassing.", expr: 'flustered' }]}],
      [{ text: "My team says I smile more these days. I blamed the weather.", choices: [
          { text: "It's definitely not the weather.", aff: 2, react: "Shut UP.", expr: 'flustered' },
          { text: "Smiling looks good on you.", aff: 2, react: "Don't— I'm trying to be TOUGH here.", expr: 'flustered' }]},
       { text: "I want to play doubles with you someday. Us vs everyone.", choices: [
          { text: "Partners forever.", aff: 2, react: "...Yeah. Partners.", expr: 'happy' },
          { text: "We'd crush everyone.", aff: 1, react: "Obviously. We're unstoppable.", expr: 'smirk' }]}],
      [{ text: "I've been thinking about what I'd say if this was our last match.", choices: [
          { text: "What would you say?", aff: 2, react: "...Ask me again after we play.", expr: 'flustered' },
          { text: "It won't be our last.", aff: 1, react: "Promise?", expr: 'happy' }]},
       { text: "You know what my biggest fear is? That this ends.", choices: [
          { text: "It doesn't have to.", aff: 2, react: "...Okay. Then it won't.", expr: 'happy' },
          { text: "We'll make it last.", aff: 1, react: "Starting right now.", expr: 'smirk' }]}],
      [{ text: "No witty banter today. I just want to look at you.", choices: [
          { text: "I'm looking right back.", aff: 2, react: "*small genuine smile* Good.", expr: 'happy' },
          { text: "You're making me blush.", aff: 1, react: "Welcome to MY world.", expr: 'smirk' }]},
       { text: "After this... there's something I need to tell you. Win or lose.", choices: [
          { text: "I already know.", aff: 2, react: "...Maybe. But I want to say it anyway.", expr: 'flustered' },
          { text: "I'm all ears.", aff: 1, react: "Good. Because my heart is all... yours.", expr: 'flustered' }]}],
      [{ text: "This is it. Last match of everything. I'm not ready.", choices: [
          { text: "Neither am I. And that's okay.", aff: 2, react: "Since when are YOU the comforting one?", expr: 'flustered' },
          { text: "We've got this.", aff: 1, react: "We. I like that word.", expr: 'happy' }]},
       { text: "May the best player win. ...Even if it's you.", choices: [
          { text: "Especially if it's me.", aff: 2, react: "HA. One last cocky moment. I respect it.", expr: 'smirk' },
          { text: "We both win today.", aff: 2, react: "...Yeah. We do.", expr: 'happy' }]}]
    ],
    yuki: [
      [{ text: _td('hsYuki1FU1Text', "I-I made you a bookmark! It has a little ping pong ball on it..."), choices: [
          { text: _td('hsYuki1FU2Text', "This is the cutest thing I've ever received."), aff: 2, react: "R-really?! I was worried it was too much...", expr: 'flustered' },
          { text: _td('hsYuki1FU3Text', "Thanks, Yuki!"), aff: 1, react: "I'm glad you like it! I made five before getting one right...", expr: 'happy' }]},
       { text: _td('hsYuki1FU4Text', "Um... do you have a favorite book? I want to know more about you."), choices: [
          { text: _td('hsYuki1FU5Text', "I'd rather hear about yours."), aff: 2, react: "O-oh! I have a list! A very long list...", expr: 'happy' },
          { text: _td('hsYuki1FU6Text', "I'm more of a movie person."), aff: 0, react: "Movies are good too! W-we could watch one sometime...", expr: 'surprised' }]}],
      [{ text: _td('hsYuki2FU1Text', "I practiced my serve 200 times last night. I counted."), choices: [
          { text: _td('hsYuki2FU2Text', "Your dedication is incredible."), aff: 2, react: "I just... wanted to be worth playing against...", expr: 'flustered' },
          { text: _td('hsYuki2FU3Text', "200?! Don't hurt yourself."), aff: 1, react: "My arm is a little sore... but it's worth it.", expr: 'happy' }]},
       { text: _td('hsYuki2FU4Text', "Can I tell you something weird? I dream about ping pong now."), choices: [
          { text: _td('hsYuki2FU5Text', "Am I in the dreams?"), aff: 2, react: "I\u2014 th-that's\u2014 MOVING ON.", expr: 'flustered' },
          { text: _td('hsYuki2FU6Text', "That's not weird at all."), aff: 1, react: "Really? You don't think I'm strange?", expr: 'happy' }]}],
      [{ text: _td('hsYuki3FU1Text', "The sunset is beautiful tonight. Like the inside of a seashell."), choices: [
          { text: _td('hsYuki3FU2Text', "Not as beautiful as you."), aff: 3, react: "*drops books* I\u2014 you can't just SAY things like\u2014!", expr: 'flustered' },
          { text: _td('hsYuki3FU3Text', "You should write poetry."), aff: 1, react: "I... actually do. In secret.", expr: 'surprised' }]},
       { text: _td('hsYuki3FU4Text', "Nobody's ever spent this much time with me before. On purpose."), choices: [
          { text: _td('hsYuki3FU5Text', "Their loss. Seriously."), aff: 2, react: "...Thank you. That means everything.", expr: 'happy' },
          { text: _td('hsYuki3FU6Text', "You're easy to be around."), aff: 1, react: "That's... the nicest thing anyone's said.", expr: 'happy' }]}],
      [{ text: _td('hsYuki4FU1Text', "I was reading about how stars form. It's a lot like friendship."), choices: [
          { text: _td('hsYuki4FU2Text', "Tell me about it."), aff: 2, react: "Really? You want to hear? *lights up* So, gravity pulls dust together...", expr: 'happy' },
          { text: _td('hsYuki4FU3Text', "You're such a nerd."), aff: -1, react: "O-oh... sorry, I know it's boring...", expr: 'sad' }]},
       { text: _td('hsYuki4FU4Text', "I brought us tea. Chamomile. I-it's calming before a match."), choices: [
          { text: _td('hsYuki4FU5Text', "You thought of everything."), aff: 2, react: "I like taking care of... people.", expr: 'flustered' },
          { text: _td('hsYuki4FU6Text', "I could use some calm."), aff: 1, react: "Me too. *sips together in comfortable silence*", expr: 'happy' }]}],
      [{ text: _td('hsYuki5FU1Text', "My mom asked about you. I didn't know what to say."), choices: [
          { text: _td('hsYuki5FU2Text', "Tell her I'm your biggest fan."), aff: 2, react: "*covers face* She'd never stop teasing me!", expr: 'flustered' },
          { text: _td('hsYuki5FU3Text', "What did she ask?"), aff: 1, react: "If you're... nice. I said the nicest.", expr: 'happy' }]},
       { text: _td('hsYuki5FU4Text', "I wrote a haiku about today. Want to hear?"), choices: [
          { text: _td('hsYuki5FU5Text', "Please. I'd love that."), aff: 2, react: "'Ping pong ball bounces / Your smile across the table / My heart returns serve'", expr: 'flustered' },
          { text: _td('hsYuki5FU6Text', "Go for it!"), aff: 1, react: "Okay... *takes deep breath* It's about... us. Sort of.", expr: 'happy' }]}],
      [{ text: _td('hsYuki6FU1Text', "I've been braver lately. I even ordered food without stuttering."), choices: [
          { text: _td('hsYuki6FU2Text', "I'm so proud of you, Yuki."), aff: 2, react: "*tears up a little* Y-you always believe in me...", expr: 'happy' },
          { text: _td('hsYuki6FU3Text', "Growth looks good on you."), aff: 2, react: "...That's the kind of thing that makes me brave.", expr: 'flustered' }]},
       { text: _td('hsYuki6FU4Text', "After today's match... can we sit on the roof again?"), choices: [
          { text: _td('hsYuki6FU5Text', "I'd follow you anywhere."), aff: 2, react: "P-please don't say things like that when I'm trying not to cry!", expr: 'flustered' },
          { text: _td('hsYuki6FU6Text', "Our spot. I'll be there."), aff: 1, react: "*smiles quietly* Our spot. I like that.", expr: 'happy' }]}],
      [{ text: _td('hsYuki7FU1Text', "I want to say something I've been practicing. Out loud. To you."), choices: [
          { text: _td('hsYuki7FU2Text', "Take your time. I'm here."), aff: 2, react: "*deep breath* You make the world less scary. There. I said it.", expr: 'happy' },
          { text: _td('hsYuki7FU3Text', "You can tell me anything."), aff: 1, react: "I know. That's why this is so hard. And so easy.", expr: 'flustered' }]},
       { text: _td('hsYuki7FU4Text', "One last game. Then... whatever comes next."), choices: [
          { text: _td('hsYuki7FU5Text', "Together."), aff: 2, react: "Together. *squeezes paddle* ...Let's play.", expr: 'happy' },
          { text: _td('hsYuki7FU6Text', "You're going to do great."), aff: 1, react: "Because of you.", expr: 'happy' }]}],
      [{ text: "I-I tried a new hairstyle today. D-do you notice anything different?", choices: [
          { text: "You look amazing.", aff: 2, react: "*touches hair* Y-you really think so?!", expr: 'flustered' },
          { text: "New clip?", aff: 1, react: "Y-yes! It has a little star on it!", expr: 'happy' }]},
       { text: "Reading poetry helps me be brave. Want to hear one?", choices: [
          { text: "Always.", aff: 2, react: "'Two paddles, one table, infinite possibility.' ...It's about us.", expr: 'flustered' },
          { text: "Go for it!", aff: 1, react: "*recites softly* I hope I didn't mess it up...", expr: 'happy' }]}],
      [{ text: "I made a playlist for our matches. E-each song reminds me of you.", choices: [
          { text: "Play it for me.", aff: 2, react: "*puts in earbuds nervously* The first song is called 'Brave'...", expr: 'flustered' },
          { text: "How many songs?", aff: 1, react: "T-twenty-three. One for each time you made me smile.", expr: 'happy' }]},
       { text: "My journal has more pages about you than about anything else.", choices: [
          { text: "I'm honored to be in your story.", aff: 2, react: "You ARE my story... at least the best chapter.", expr: 'flustered' },
          { text: "What do you write?", aff: 1, react: "M-moments. The ones that feel like magic.", expr: 'happy' }]}],
      [{ text: "The rain stopped but the petals are falling. It's like nature is celebrating.", choices: [
          { text: "Dancing with you under the petals.", aff: 2, react: "*takes your hand* I-I'll try not to step on your feet!", expr: 'flustered' },
          { text: "It's beautiful.", aff: 1, react: "Not as beautiful as— n-nevermind!", expr: 'flustered' }]},
       { text: "I packed us lunch. I-it's shaped like ping pong paddles!", choices: [
          { text: "You're the most thoughtful person alive.", aff: 2, react: "I just... want to make you smile. It's my favorite thing.", expr: 'happy' },
          { text: "This is adorable!", aff: 1, react: "The rice balls kept falling apart but I tried!", expr: 'happy' }]}],
      [{ text: "I gave a speech in class today. About someone who inspired me.", choices: [
          { text: "Was it about me?", aff: 2, react: "*nods slowly* E-everyone clapped. I almost fainted.", expr: 'flustered' },
          { text: "That's amazing, Yuki!", aff: 1, react: "I k-kept imagining you in the audience. It helped.", expr: 'happy' }]},
       { text: "Do you believe in fate? Like some people are meant to meet?", choices: [
          { text: "I believe in us.", aff: 2, react: "...That's better than fate. That's choice.", expr: 'happy' },
          { text: "Maybe. We did meet.", aff: 1, react: "The best maybe of my life.", expr: 'flustered' }]}],
      [{ text: "I finished all 1000 paper cranes. My wish... it already came true.", choices: [
          { text: "What was the wish?", aff: 2, react: "*whispers* You. It was always you.", expr: 'flustered' },
          { text: "Yuki, that's incredible.", aff: 1, react: "My fingers are sore. But my heart is full.", expr: 'happy' }]},
       { text: "I'm not shaking anymore. See? Steady hands.", choices: [
          { text: "Because you found your strength.", aff: 2, react: "Because I found someone worth being strong for.", expr: 'happy' },
          { text: "You've grown so much.", aff: 1, react: "Only because you gave me room to grow.", expr: 'flustered' }]}],
      [{ text: "I want to read you the last page of my journal. No more secrets.", choices: [
          { text: "I'm ready to hear it.", aff: 2, react: "'Today I stop being afraid. Today I tell them everything.'", expr: 'happy' },
          { text: "Yuki...", aff: 1, react: "Don't cry! I-I'll start crying too!", expr: 'flustered' }]},
       { text: "Last match. My hands are shaking again. But it's the good kind.", choices: [
          { text: "Hold my hand until they stop.", aff: 2, react: "*holds tight* ...They stopped. You're magic.", expr: 'flustered' },
          { text: "You've got this.", aff: 1, react: "WE'VE got this.", expr: 'happy' }]}],
      [{ text: "No words today. Just... *shows you a drawing of both of you playing ping pong*", choices: [
          { text: "*hugs her*", aff: 2, react: "*hugs back tightly* D-don't let go yet...", expr: 'happy' },
          { text: "Frame this. It's a masterpiece.", aff: 2, react: "It's us. That's what makes it perfect.", expr: 'flustered' }]},
       { text: "Ready? ...I am. Finally.", choices: [
          { text: "Together, one last time.", aff: 2, react: "Together. Always.", expr: 'happy' },
          { text: "Show them what you've got.", aff: 1, react: "I'll show YOU. That's all that matters.", expr: 'happy' }]}]
    ],
    rin: [
      [{ text: _td('hsRin1FU1Text', "Fun fact: I once won a match playing left-handed. Blindfolded."), choices: [
          { text: _td('hsRin1FU2Text', "I don't believe you but I love you for it."), aff: 2, react: "Love?! On day one?! Bold move~!", expr: 'happy' },
          { text: _td('hsRin1FU3Text', "Pics or it didn't happen."), aff: 1, react: "The pics are classified. Top secret pong intel.", expr: 'smirk' }]},
       { text: _td('hsRin1FU4Text', "So what's YOUR deal? Why ping pong?"), choices: [
          { text: _td('hsRin1FU5Text', "I came for the pong, stayed for you."), aff: 2, react: "Oh STOP. ...No wait, continue. I like this.", expr: 'happy' },
          { text: _td('hsRin1FU6Text', "I just like hitting things."), aff: 1, react: "A kindred spirit of violence! Beautiful~", expr: 'smirk' }]}],
      [{ text: _td('hsRin2FU1Text', "I have a theory: you can tell everything about a person by how they serve."), choices: [
          { text: _td('hsRin2FU2Text', "What does my serve say about me?"), aff: 2, react: "That you're earnest. Genuine. ...It's annoying how charming that is.", expr: 'happy' },
          { text: _td('hsRin2FU3Text', "That's ridiculous."), aff: 0, react: "See? Skeptic serve. Exactly what I predicted.", expr: 'smirk' }]},
       { text: _td('hsRin2FU4Text', "Want to see something cool? I modified a paddle with LED lights."), choices: [
          { text: _td('hsRin2FU5Text', "You're an absolute menace and I'm here for it."), aff: 2, react: "FINALLY someone who appreciates art!", expr: 'happy' },
          { text: _td('hsRin2FU6Text', "Is that tournament legal?"), aff: -1, react: "You sound like the ref. Boring~", expr: 'annoyed' }]}],
      [{ text: _td('hsRin3FU1Text', "I bet you think I'm always this chaotic. The truth is... I choose to be."), choices: [
          { text: _td('hsRin3FU2Text', "The real question is who you are when you choose not to be."), aff: 3, react: "...You're dangerously perceptive. I like it and I hate it.", expr: 'surprised' },
          { text: _td('hsRin3FU3Text', "Chaos is fun."), aff: 1, react: "It IS! See, you get it~", expr: 'happy' }]},
       { text: _td('hsRin3FU4Text', "When I was little, I was actually really quiet. Hard to believe, right?"), choices: [
          { text: _td('hsRin3FU5Text', "I can see it, actually."), aff: 2, react: "...How? Nobody else can.", expr: 'surprised' },
          { text: _td('hsRin3FU6Text', "What changed?"), aff: 1, react: "I got tired of being invisible. So I became... impossible to ignore.", expr: 'neutral' }]}],
      [{ text: _td('hsRin4FU1Text', "Okay real talk. Rate our chemistry. Scale of 1 to dynamite."), choices: [
          { text: _td('hsRin4FU2Text', "Nuclear."), aff: 2, react: "Nuclear?! That's past my scale! I need a bigger chart~!", expr: 'happy' },
          { text: _td('hsRin4FU3Text', "Solid 7."), aff: 1, react: "SEVEN? I'm offended but motivated. Watch me make it a 10.", expr: 'smirk' }]},
       { text: _td('hsRin4FU4Text', "My friends say I flirt with everyone. But with you it's... different."), choices: [
          { text: _td('hsRin4FU5Text', "Different how?"), aff: 2, react: "Different like... I actually mean it. Wow, did I just say that out loud?", expr: 'flustered' },
          { text: _td('hsRin4FU6Text', "I noticed."), aff: 1, react: "Of course you did. You notice everything about me.", expr: 'happy' }]}],
      [{ text: _td('hsRin5FU1Text', "I learned a new trick shot. Named it after you."), choices: [
          { text: _td('hsRin5FU2Text', "What's it called?"), aff: 2, react: "The Heartbreaker. Because it always lands. *winks*", expr: 'smirk' },
          { text: _td('hsRin5FU3Text', "I'm honored."), aff: 1, react: "You should be. I don't name shots after just anyone.", expr: 'happy' }]},
       { text: _td('hsRin5FU4Text', "Do you think people can change? Like, really change?"), choices: [
          { text: _td('hsRin5FU5Text', "I think you already are."), aff: 3, react: "...Okay, that actually got me. Point to you.", expr: 'flustered' },
          { text: _td('hsRin5FU6Text', "Why do you ask?"), aff: 1, react: "No reason. ...Every reason. Same thing.", expr: 'neutral' }]}],
      [{ text: _td('hsRin6FU1Text', "I didn't sleep. I was thinking about what you said yesterday."), choices: [
          { text: _td('hsRin6FU2Text', "Which part?"), aff: 1, react: "All of it. Every word. I have a very specific problem and it's you.", expr: 'happy' },
          { text: _td('hsRin6FU3Text', "Good thoughts?"), aff: 2, react: "The best kind. The scary kind. ...Same thing.", expr: 'flustered' }]},
       { text: _td('hsRin6FU4Text', "After this match, I want to show you my real laugh. Not the performance one."), choices: [
          { text: _td('hsRin6FU5Text', "I've been waiting for that."), aff: 2, react: "...How did you know there was a difference?", expr: 'surprised' },
          { text: _td('hsRin6FU6Text', "Deal."), aff: 1, react: "Deal. *genuine small smile*", expr: 'happy' }]}],
      [{ text: _td('hsRin7FU1Text', "No tricks today. No jokes. Just... us."), choices: [
          { text: _td('hsRin7FU2Text', "I like 'us.'"), aff: 2, react: "Me too. And it terrifies me. In the best way.", expr: 'happy' },
          { text: _td('hsRin7FU3Text', "The real Rin. Finally."), aff: 2, react: "She's been here the whole time. You're just the first to look.", expr: 'flustered' }]},
       { text: _td('hsRin7FU4Text', "Whatever I wrote in that note... just know every word is true."), choices: [
          { text: _td('hsRin7FU5Text', "I already know."), aff: 2, react: "...Then let's play. One last time. For real.", expr: 'happy' },
          { text: _td('hsRin7FU6Text', "I can't wait to read it."), aff: 1, react: "Be gentle with it. It's the most honest thing I've ever done.", expr: 'flustered' }]}],
      [{ text: "I memorized your play style. Every quirk. It's not stalking, it's SCIENCE.", choices: [
          { text: "What did you learn?", aff: 2, react: "That you tilt your head when you focus. It's lethal.", expr: 'flustered' },
          { text: "I memorized yours too.", aff: 1, react: "OH? Pop quiz later then~", expr: 'smirk' }]},
       { text: "My prank folder has a new category: 'pranks to do together.'", choices: [
          { text: "I'm in.", aff: 2, react: "Bonnie and Clyde but make it ping pong~", expr: 'happy' },
          { text: "What's the first prank?", aff: 1, react: "Classified until you pass the initiation.", expr: 'smirk' }]}],
      [{ text: "I told my best friend about you. She says I'm 'disgustingly happy.'", choices: [
          { text: "Disgustingly happy suits you.", aff: 2, react: "Gross. ...Do I really look happy though?", expr: 'flustered' },
          { text: "Tell her I said thanks.", aff: 1, react: "She already wants to meet you. I said no. For now.", expr: 'smirk' }]},
       { text: "Would you play ping pong in the rain? With me?", choices: [
          { text: "I'd play anything, anywhere, with you.", aff: 2, react: "*pauses* ...That's the most Rin-proof answer possible.", expr: 'flustered' },
          { text: "The ball would get slippery.", aff: 0, react: "PHYSICS isn't the POINT here!", expr: 'annoyed' }]}],
      [{ text: "I stopped wearing my 'performance smile' around you weeks ago.", choices: [
          { text: "I noticed. The real smile is better.", aff: 2, react: "...How did you always tell the difference?", expr: 'flustered' },
          { text: "Good. I prefer the real Rin.", aff: 2, react: "She prefers you too. Obviously.", expr: 'happy' }]},
       { text: "Let's make a time capsule. Us stuff only.", choices: [
          { text: "Brilliant. What goes in first?", aff: 2, react: "This moment. Right here. Captured forever.", expr: 'happy' },
          { text: "Where do we bury it?", aff: 1, react: "Under the ping pong table. DUH.", expr: 'smirk' }]}],
      [{ text: "I dreamt we were old and still playing ping pong. We were terrible but laughing.", choices: [
          { text: "That sounds like the perfect future.", aff: 2, react: "*goes quiet* ...Yeah. Perfect.", expr: 'flustered' },
          { text: "We'd never be terrible.", aff: 1, react: "True. We'd be LEGENDARILY terrible.", expr: 'smirk' }]},
       { text: "Quick: three words to describe me. No thinking. Go.", choices: [
          { text: "Beautiful. Chaos. Mine.", aff: 3, react: "*speechless for once* ...Okay you WIN.", expr: 'flustered' },
          { text: "Funny, deep, unforgettable.", aff: 1, react: "Unforgettable. That one's going on my gravestone.", expr: 'happy' }]}],
      [{ text: "I started journaling. Don't tell anyone. The class clown can't have FEELINGS.", choices: [
          { text: "Your feelings are your superpower.", aff: 2, react: "...Okay that's going in the journal.", expr: 'flustered' },
          { text: "Secret's safe with me.", aff: 1, react: "I know. That's why I told you.", expr: 'happy' }]},
       { text: "All my tricks and schemes... they were just ways to get your attention.", choices: [
          { text: "You had my attention from day one.", aff: 2, react: "Then everything after was just... showing off. For you.", expr: 'flustered' },
          { text: "They worked.", aff: 1, react: "Mission accomplished then~ ...Now what?", expr: 'happy' }]}],
      [{ text: "I thought of a joke but it's not funny. It's just true.", choices: [
          { text: "Tell me anyway.", aff: 2, react: "You're the best thing that ever happened to me. ...See? Not funny at all.", expr: 'flustered' },
          { text: "The best jokes are true.", aff: 1, react: "Then my whole life is hilarious. Especially you.", expr: 'happy' }]},
       { text: "No deflecting today. I'm just going to look at you and be grateful.", choices: [
          { text: "I'm grateful too.", aff: 2, react: "...This is the scariest thing I've ever done. Being honest.", expr: 'flustered' },
          { text: "You're full of surprises.", aff: 1, react: "One more surprise after our match. I promise.", expr: 'happy' }]}],
      [{ text: "Last day. No pranks. No bits. Just me.", choices: [
          { text: "Just you is everything.", aff: 2, react: "...I practiced not crying and I'm already failing.", expr: 'flustered' },
          { text: "Let's make it count.", aff: 1, react: "Every second with you counts. It always did.", expr: 'happy' }]},
       { text: "One last trick... *pulls out a card that says 'Will you be my Player 2?'*", choices: [
          { text: "Always. Forever. Yes.", aff: 2, react: "*laughing through tears* Best trick I ever pulled~", expr: 'happy' },
          { text: "That's the best trick yet.", aff: 1, react: "Saved the best for last. Just like you.", expr: 'flustered' }]}]
    ]
  };

  /* ════════════════════════════════════════════════════════════
     THIRD FOLLOW-UP — one more conversation beat before the match
     ════════════════════════════════════════════════════════════ */
  var FOLLOWUPS_3 = {
    hana: [
      { text: _td('hsHana1FU3Text', "You know what? You're the first person who doesn't bore me."), choices: [
        { text: _td('hsHana2FU3Text', "High praise from the champion."), aff: 2, react: "Don't get used to compliments.", expr: 'smirk' },
        { text: _td('hsHana3FU3Text', "You don't bore me either."), aff: 1, react: "Obviously. I'm fascinating.", expr: 'happy' }]},
      { text: _td('hsHana4FU3Text', "I watched your match against Sato. You've got potential."), choices: [
        { text: _td('hsHana5FU3Text', "You watched my match?!"), aff: 2, react: "For RESEARCH. Don't be weird.", expr: 'flustered' },
        { text: _td('hsHana6FU3Text', "Any tips?"), aff: 1, react: "Hit harder. Care less. ...One of those is bad advice.", expr: 'smirk' }]},
      { text: _td('hsHana7FU3Text', "My hands are shaking. I never shake. What are you doing to me?"), choices: [
        { text: _td('hsHana8FU3Text', "Maybe you're excited."), aff: 2, react: "Excited? About YOU? ...Maybe.", expr: 'flustered' },
        { text: _td('hsHana9FU3Text', "Maybe you need to eat."), aff: 0, react: "Romance: zero. But you're probably right.", expr: 'annoyed' }]},
      { text: _td('hsHana10FU3Text', "I called you my rival to my team. They said that's not what rivals look like."), choices: [
        { text: _td('hsHana11FU3Text', "What do rivals look like?"), aff: 2, react: "Not like... this. Apparently I smile too much around you.", expr: 'flustered' },
        { text: _td('hsHana12FU3Text', "We're more than rivals."), aff: 2, react: "Don't say that before a match. I need to focus.", expr: 'flustered' }]},
      { text: _td('hsHana13FU3Text', "I keep the scorecard from our first match. It's in my locker."), choices: [
        { text: _td('hsHana14FU3Text', "Sentimental for someone who 'only cares about winning.'"), aff: 2, react: "I WILL destroy you. ...Right after being emotional.", expr: 'flustered' },
        { text: _td('hsHana15FU3Text', "I kept mine too."), aff: 2, react: "...We're both idiots, aren't we?", expr: 'happy' }]},
      { text: _td('hsHana16FU3Text', "I want to tell you something after the match. Promise you'll stay."), choices: [
        { text: _td('hsHana17FU3Text', "I'm not going anywhere."), aff: 2, react: "*deep breath* Okay. Good. Let's play.", expr: 'happy' },
        { text: _td('hsHana18FU3Text', "Wild horses couldn't drag me away."), aff: 1, react: "Dramatic. I like it. Now let's GO.", expr: 'smirk' }]},
      { text: _td('hsHana19FU3Text', "I'm going to play my absolute best. Because you deserve that."), choices: [
        { text: _td('hsHana20FU3Text', "So will I. For you."), aff: 2, react: "May the best heart win. ...I said heart. I meant player.", expr: 'flustered' },
        { text: _td('hsHana21FU3Text', "Bring it on, Takeda."), aff: 1, react: "There's the fire. I've been waiting for that.", expr: 'happy' }]},
      { text: "You know my coffee order. That's... significant.", choices: [
        { text: "I pay attention to you.", aff: 2, react: "...Nobody else does.", expr: 'flustered' },
        { text: "Black with sugar. Like you.", aff: 1, react: "Did you just call me SWEET?!", expr: 'flustered' }]},
      { text: "My sister found the training schedule. She drew hearts all over it.", choices: [
        { text: "Smart sister.", aff: 2, react: "She's GROUNDED.", expr: 'flustered' },
        { text: "Are the hearts accurate?", aff: 1, react: "...No comment.", expr: 'flustered' }]},
      { text: "This storm makes me feel alive. Like a championship point.", choices: [
        { text: "You make ME feel alive.", aff: 2, react: "...Okay. That was good. I'll give you that.", expr: 'flustered' },
        { text: "Let's play through it.", aff: 1, react: "Now you're speaking my language.", expr: 'happy' }]},
      { text: "I recorded myself practicing. I look ridiculous. Want to see?", choices: [
        { text: "You look passionate. That's beautiful.", aff: 2, react: "Beautiful?! I look like a MANIAC.", expr: 'flustered' },
        { text: "Send it to me.", aff: 1, react: "If this leaks I'll END you.", expr: 'smirk' }]},
      { text: "Everyone at school thinks we're dating. I didn't correct them.", choices: [
        { text: "Neither did I.", aff: 2, react: "...Oh. So we're both just... letting that happen?", expr: 'flustered' },
        { text: "Are we?", aff: 2, react: "I— that's— MATCH TIME.", expr: 'flustered' }]},
      { text: "I wrote your name in the margin of my notebook. In tiny letters.", choices: [
        { text: "In a heart?", aff: 2, react: "...It was a STRATEGIC CIRCLE.", expr: 'flustered' },
        { text: "I wrote yours too.", aff: 2, react: "...We're BOTH idiots.", expr: 'happy' }]},
      { text: "Today I play for real. Everything I have. Because you're worth it.", choices: [
        { text: "You're worth everything too.", aff: 2, react: "...Don't make me cry before a match, dork.", expr: 'flustered' },
        { text: "Give me your best shot.", aff: 1, react: "My best shot is reserved for people I love. ...I mean BEAT.", expr: 'flustered' }]}
    ],
    yuki: [
      { text: _td('hsYuki1FU3Text', "I-I've been meaning to ask... what's your favorite color? For... research."), choices: [
        { text: _td('hsYuki2FU3Text', "Whatever color your eyes are."), aff: 3, react: "*drops everything* Y-you can't just\u2014! My heart\u2014!", expr: 'flustered' },
        { text: _td('hsYuki3FU3Text', "Blue. Like the sky."), aff: 1, react: "Blue is calming. I like blue too.", expr: 'happy' }]},
      { text: _td('hsYuki4FU3Text', "I made flashcards for spin techniques. There are 47."), choices: [
        { text: _td('hsYuki5FU3Text', "Show me all 47."), aff: 2, react: "Really?! Most people give up after three!", expr: 'happy' },
        { text: _td('hsYuki6FU3Text', "You're the most dedicated person I know."), aff: 2, react: "O-only because you give me something to be dedicated for...", expr: 'flustered' }]},
      { text: _td('hsYuki7FU3Text', "Someone was mean to me and I stood up for myself. First time ever."), choices: [
        { text: _td('hsYuki8FU3Text', "Yuki, that's HUGE."), aff: 2, react: "I kept thinking 'what would they think?' ...Them being you.", expr: 'flustered' },
        { text: _td('hsYuki9FU3Text', "What did you say?"), aff: 1, react: "I said 'no thank you.' But I said it FIRMLY.", expr: 'happy' }]},
      { text: _td('hsYuki10FU3Text', "I pressed flowers from the day we first met. Is that weird?"), choices: [
        { text: _td('hsYuki11FU3Text', "It's the most Yuki thing ever. I love it."), aff: 2, react: "You say my name like it's something precious...", expr: 'flustered' },
        { text: _td('hsYuki12FU3Text', "Which flowers?"), aff: 1, react: "Daisies. Growing by the ping pong table.", expr: 'happy' }]},
      { text: _td('hsYuki13FU3Text', "My anxiety was bad today. But then I remembered we'd play together."), choices: [
        { text: _td('hsYuki14FU3Text', "I'm glad I can be that for you."), aff: 2, react: "You're my favorite kind of calm.", expr: 'happy' },
        { text: _td('hsYuki15FU3Text', "We don't have to play if you're not up for it."), aff: 1, react: "No\u2014 I WANT to. You make it better.", expr: 'happy' }]},
      { text: _td('hsYuki16FU3Text', "I finished a whole poem about someone. Want the first line?"), choices: [
        { text: _td('hsYuki17FU3Text', "Every word."), aff: 2, react: "'In the space between serves, I found a home.' ...You're the home.", expr: 'flustered' },
        { text: _td('hsYuki18FU3Text', "Save it for after the match."), aff: 1, react: "O-okay. Something to look forward to.", expr: 'happy' }]},
      { text: _td('hsYuki19FU3Text', "No matter what happens today: you changed my life."), choices: [
        { text: _td('hsYuki20FU3Text', "You changed mine too, Yuki."), aff: 2, react: "*tears falling but smiling* Let's play. Through the tears.", expr: 'happy' },
        { text: _td('hsYuki21FU3Text', "We changed each other."), aff: 2, react: "That's the most beautiful thing I've ever heard.", expr: 'flustered' }]},
      { text: "I-I actually raised my hand in class today! Without overthinking!", choices: [
        { text: "Look at you, conquering the world!", aff: 2, react: "Just one classroom... but it felt like the world!", expr: 'happy' },
        { text: "What did you say?", aff: 1, react: "I answered correctly! The teacher was shocked!", expr: 'happy' }]},
      { text: "I drew a manga panel of us. Y-you're the hero and I'm... the love interest.", choices: [
        { text: "Can I keep it?", aff: 2, react: "Y-yes! I made a copy because I knew you'd ask!", expr: 'flustered' },
        { text: "You're the hero of your own story.", aff: 2, react: "...With you as my co-author?", expr: 'flustered' }]},
      { text: "The petals are falling again. They remind me of the first time we played.", choices: [
        { text: "Every petal is a memory.", aff: 2, react: "I want to press them all...", expr: 'happy' },
        { text: "Let's make new memories today.", aff: 1, react: "E-each one more precious than the last.", expr: 'flustered' }]},
      { text: "I named my plant after you. She's thriving.", choices: [
        { text: "Like us.", aff: 2, react: "L-like... us? *blushes to ears*", expr: 'flustered' },
        { text: "What kind of plant?", aff: 1, react: "A sunflower. Because you make me turn toward the light.", expr: 'happy' }]},
      { text: "I read a quote: 'The bravest thing is to be kind.' You taught me that.", choices: [
        { text: "You were always kind. You just needed confidence.", aff: 2, react: "And you gave me that. Every single day.", expr: 'happy' },
        { text: "You're the kindest person I know.", aff: 1, react: "O-only because you showed me it was safe to be.", expr: 'flustered' }]},
      { text: "I finished crane number 999. Only one more.", choices: [
        { text: "Let me fold the last one with you.", aff: 2, react: "*tears up* T-together? The last one? ...Yes.", expr: 'flustered' },
        { text: "Your wish is almost ready.", aff: 1, react: "It already came true. This crane is just proof.", expr: 'happy' }]},
      { text: "I'm not scared anymore. Not of ping pong. Not of speaking up. Not of... loving.", choices: [
        { text: "You're the bravest person in this room.", aff: 2, react: "Only because you're IN the room with me.", expr: 'happy' },
        { text: "Love isn't scary when it's real.", aff: 2, react: "...It's the most real thing I've ever felt.", expr: 'flustered' }]}
    ],
    rin: [
      { text: _td('hsRin1FU3Text', "Pop quiz! What's my favorite food? 3 seconds. Go."), choices: [
        { text: _td('hsRin2FU3Text', "Something chaotic. Pineapple pizza."), aff: 2, react: "CORRECT! Are you psychic or just perfect?!", expr: 'happy' },
        { text: _td('hsRin3FU3Text', "No idea."), aff: 0, react: "Unacceptable. You have homework now.", expr: 'smirk' }]},
      { text: _td('hsRin4FU3Text', "I ranked everyone here. You're number one."), choices: [
        { text: _td('hsRin5FU3Text', "Too late. It's gone to my heart."), aff: 2, react: "CORNY! ...But effective. Ugh.", expr: 'flustered' },
        { text: _td('hsRin6FU3Text', "What's the criteria?"), aff: 1, react: "Vibes, chaos tolerance, smile quality. You aced all three.", expr: 'smirk' }]},
      { text: _td('hsRin7FU3Text', "My best friend says I sound 'dangerously smitten.'"), choices: [
        { text: _td('hsRin8FU3Text', "Dangerously? So on-brand."), aff: 2, react: "Everything I do is dangerous, darling~", expr: 'smirk' },
        { text: _td('hsRin9FU3Text', "Are you? Smitten?"), aff: 2, react: "...Next question.", expr: 'flustered' }]},
      { text: _td('hsRin10FU3Text', "I've been less funny lately. Want to know why?"), choices: [
        { text: _td('hsRin11FU3Text', "Because you're being real instead."), aff: 3, react: "Stop seeing through me. It's rude. And amazing.", expr: 'flustered' },
        { text: _td('hsRin12FU3Text', "You're still pretty funny."), aff: 1, react: "Thanks. But funny isn't what I'm going for anymore.", expr: 'happy' }]},
      { text: _td('hsRin13FU3Text', "I carved our initials into the ping pong table. Janitor was NOT happy."), choices: [
        { text: _td('hsRin14FU3Text', "You're unhinged and I adore you."), aff: 2, react: "That's the nicest\u2014 I'm not crying, you're crying.", expr: 'flustered' },
        { text: _td('hsRin15FU3Text', "We're going to get in trouble."), aff: 0, react: "Worth it. Some things need to be permanent.", expr: 'happy' }]},
      { text: _td('hsRin16FU3Text', "Can I ask something real? No jokes, no deflecting."), choices: [
        { text: _td('hsRin17FU3Text', "Always."), aff: 2, react: "Do you see me? The real me? Not the show?", expr: 'surprised' },
        { text: _td('hsRin18FU3Text', "I'm listening."), aff: 1, react: "...You always are. That's the answer, isn't it?", expr: 'happy' }]},
      { text: _td('hsRin19FU3Text', "I'm scared. Not of losing. Of what happens when the games are over."), choices: [
        { text: _td('hsRin20FU3Text', "Then we'll find new games. Together."), aff: 2, react: "...Promise?", expr: 'happy' },
        { text: _td('hsRin21FU3Text', "Endings are just new beginnings."), aff: 1, react: "The old me would mock that. The new me believes it.", expr: 'flustered' }]},
      { text: "I started a 'things that aren't pranks' list. You're on it.", choices: [
        { text: "What else is on the list?", aff: 2, react: "Just you. That's the whole list.", expr: 'flustered' },
        { text: "I'm honored.", aff: 1, react: "You should be. That list is VERY exclusive.", expr: 'smirk' }]},
      { text: "I actually apologized to the janitor. About the initials.", choices: [
        { text: "Character growth!", aff: 2, react: "Ugh, don't make it a THING. I just felt bad.", expr: 'flustered' },
        { text: "What did he say?", aff: 1, react: "He said 'about time.' Fair.", expr: 'smirk' }]},
      { text: "Do you think there's a universe where we never met?", choices: [
        { text: "Then I'd spend that life looking for you.", aff: 2, react: "...That's the most anime thing anyone's ever said to me.", expr: 'flustered' },
        { text: "Impossible. We were always going to meet.", aff: 2, react: "Destiny? From YOU? I'm swooning~", expr: 'happy' }]},
      { text: "I made you a playlist but every song title spells out a message.", choices: [
        { text: "What does it spell?", aff: 2, react: "...Y-O-U-M-A-K-E-M-E-R-E-A-L. Don't laugh!", expr: 'flustered' },
        { text: "You're such a romantic.", aff: 1, react: "I am NOT— okay I totally am.", expr: 'flustered' }]},
      { text: "My performance persona has a name. Today she's off duty.", choices: [
        { text: "What's her name?", aff: 1, react: "'Sparkle Rin.' She's retiring. The real one is better.", expr: 'happy' },
        { text: "I like the off-duty version.", aff: 2, react: "She likes you too. More than like.", expr: 'flustered' }]},
      { text: "I tried writing you a song. It's terrible. Want to hear it?", choices: [
        { text: "Every word.", aff: 2, react: "*sings badly* 'You're my ace, my favorite face~' ...I TOLD you it was terrible.", expr: 'flustered' },
        { text: "I bet it's perfect.", aff: 1, react: "Perfectly terrible. Which is perfectly us.", expr: 'happy' }]},
      { text: "No performance. No persona. No filter. Just: I'm grateful you exist.", choices: [
        { text: "Come here.", aff: 2, react: "*walks into hug* ...Best trick I never planned.", expr: 'happy' },
        { text: "Same. Completely same.", aff: 1, react: "Then let's exist together. For as long as possible.", expr: 'flustered' }]}
    ]
  };
  CHAR_KEYS.forEach(function(k) {
    for (var d = 0; d < FOLLOWUPS[k].length; d++) {
      FOLLOWUPS[k][d].push(FOLLOWUPS_3[k][d]);
    }
  });

  /* ════════════════════════════════════════════════════════════
     POST-MATCH WALKS — after results, before next day
     ════════════════════════════════════════════════════════════ */
  var POST_MATCH = {
    hana: { win: [
      { text: "Okay fine. You won. ...Walk me home?", choices: [
        { text: "Lead the way.", aff: 2, react: "*falls into step, unusually quiet, but smiling*", expr: 'happy' },
        { text: "Only if you admit I'm good.", aff: 1, react: "You're... adequate. *tries not to smile*", expr: 'smirk' }]},
      { text: "Two wins now. You're starting to scare me.", choices: [
        { text: "Scared looks cute on you.", aff: 2, react: "I am NOT cute. I am FORMIDABLE.", expr: 'flustered' },
        { text: "Good.", aff: 1, react: "...Yeah. It is good.", expr: 'happy' }]},
      { text: "I'm buying you a victory drink. Non-negotiable.", choices: [
        { text: "Is this a date?", aff: 2, react: "It's a DRINK. ...fine. Maybe.", expr: 'flustered' },
        { text: "You're being nice. Who are you?", aff: 1, react: "Temporary insanity. Enjoy it.", expr: 'smirk' }]}
    ], loss: [
      { text: _td('hsHanaPML1Text', "Better luck next time. ...You okay though?"), choices: [
        { text: _td('hsHanaPML1C1', "Losing to you doesn't feel like losing."), aff: 2, react: _td('hsHanaPML1R1', "...Smoothest thing you've ever said."), expr: 'flustered' },
        { text: _td('hsHanaPML1C2', "I'll get you next time."), aff: 1, react: _td('hsHanaPML1R2', "THAT'S the spirit!"), expr: 'happy' }]},
      { text: _td('hsHanaPML2Text', "Hey. Chin up. You played better than you think."), choices: [
        { text: _td('hsHanaPML2C1', "Are you... comforting me?"), aff: 2, react: _td('hsHanaPML2R1', "NO. Stating facts. ...Are you okay?"), expr: 'flustered' },
        { text: _td('hsHanaPML2C2', "Thanks, Hana."), aff: 1, react: _td('hsHanaPML2R2', "Don't mention it. Seriously. To anyone."), expr: 'happy' }]},
      { text: _td('hsHanaPML3Text', "I pushed you hard. You took it. That takes guts."), choices: [
        { text: _td('hsHanaPML3C1', "I'd take anything from you."), aff: 2, react: _td('hsHanaPML3R1', "W-what is THAT supposed to mean?!"), expr: 'flustered' },
        { text: _td('hsHanaPML3C2', "You make me want to be better."), aff: 1, react: _td('hsHanaPML3R2', "...Good. That's really good."), expr: 'happy' }]}
    ]},
    yuki: { win: [
      { text: "You were amazing! C-can I walk with you? I'm not ready to say goodbye.", choices: [
        { text: "I'm never ready to say goodbye to you.", aff: 2, react: "*links her arm with yours* S-sorry! Was that okay?!", expr: 'flustered' },
        { text: "Of course, Yuki.", aff: 1, react: "*happy silence, walking in step*", expr: 'happy' }]},
      { text: "I made us matching keychains. Ping pong paddles. T-too much?", choices: [
        { text: "I'm putting this on my keys right now.", aff: 2, react: "*watches with shining eyes* It looks perfect...", expr: 'happy' },
        { text: "This is adorable!", aff: 1, react: "I stayed up until 2am...", expr: 'flustered' }]},
      { text: "Walking home is my favorite part of the day now. Because of... the walk.", choices: [
        { text: "Because of the company.", aff: 2, react: "...Y-yes. Specifically... yours.", expr: 'flustered' },
        { text: "Mine too.", aff: 1, react: "*smiles at the ground all the way home*", expr: 'happy' }]}
    ], loss: [
      { text: _td('hsYukiPML1Text', "I-I'm sorry I beat you! Please don't be upset!"), choices: [
        { text: _td('hsYukiPML1C1', "Yuki, you SHOULD be proud."), aff: 2, react: _td('hsYukiPML1R1', "...No one's ever told me to be proud before."), expr: 'happy' },
        { text: _td('hsYukiPML1C2', "I'm happy for you."), aff: 1, react: _td('hsYukiPML1R2', "That makes me happier than winning..."), expr: 'flustered' }]},
      { text: _td('hsYukiPML2Text', "Want to study together? M-maybe that would help..."), choices: [
        { text: _td('hsYukiPML2C1', "I'd love a study date."), aff: 2, react: _td('hsYukiPML2R1', "D-D-DATE?! I said STUDY! *face on fire*"), expr: 'flustered' },
        { text: _td('hsYukiPML2C2', "That would be great."), aff: 1, react: _td('hsYukiPML2R2', "I'll bring snacks and color-coded notes!"), expr: 'happy' }]},
      { text: _td('hsYukiPML3Text', "You let me win, didn't you? Please tell me you didn't."), choices: [
        { text: _td('hsYukiPML3C1', "You won fair and square."), aff: 2, react: _td('hsYukiPML3R1', "Then... I really AM getting better... *tears up*"), expr: 'happy' },
        { text: _td('hsYukiPML3C2', "You were just better today."), aff: 1, react: _td('hsYukiPML3R2', "B-better? Me? I need to sit down..."), expr: 'flustered' }]}
    ]},
    rin: { win: [
      { text: "Well played, champ~ Walk of victory. I'll be your entourage.", choices: [
        { text: "I'd rather you walk beside me.", aff: 2, react: "...Beside. Not behind. Noted. *softens*", expr: 'happy' },
        { text: "Entourage of one?", aff: 1, react: "Quality over quantity, baby~", expr: 'smirk' }]},
      { text: "I owe you ice cream. Winner's rules. I just invented this rule.", choices: [
        { text: "I love rules you invent.", aff: 2, react: "New rule: this is now weekly.", expr: 'happy' },
        { text: "What flavor?", aff: 1, react: "Chaos flavor. Chocolate with everything.", expr: 'smirk' }]},
      { text: "Fun fact: I've never walked anyone home before. You're the beta test.", choices: [
        { text: "How am I doing?", aff: 2, react: "Five stars. Would walk again.", expr: 'happy' },
        { text: "I'm honored.", aff: 1, react: "Cutest guinea pig, if we're being specific~", expr: 'smirk' }]}
    ], loss: [
      { text: _td('hsRinPML1Text', "Don't feel bad~ I cheat at everything. Except feelings."), choices: [
        { text: _td('hsRinPML1C1', "You have feelings?"), aff: 2, react: _td('hsRinPML1R1', "Rude! But fair. Not hidden from you, though."), expr: 'flustered' },
        { text: _td('hsRinPML1C2', "What feelings?"), aff: 1, react: _td('hsRinPML1R2', "Wouldn't YOU like to know~ ...Yes."), expr: 'smirk' }]},
      { text: _td('hsRinPML2Text', "Consolation prize: you pick the music for our walk."), choices: [
        { text: _td('hsRinPML2C1', "Something we can sing badly together."), aff: 2, react: _td('hsRinPML2R1', "PERFECT answer. You really do get me."), expr: 'happy' },
        { text: _td('hsRinPML2C2', "Your choice."), aff: 1, react: _td('hsRinPML2R2', "Bold. You trust my taste? Dangerous."), expr: 'smirk' }]},
      { text: _td('hsRinPML3Text', "Losing to me isn't really losing. It's... delayed winning."), choices: [
        { text: _td('hsRinPML3C1', "Is that Rin philosophy?"), aff: 2, react: _td('hsRinPML3R1', "It's OUR philosophy now. Exclusively."), expr: 'happy' },
        { text: _td('hsRinPML3C2', "That's actually comforting."), aff: 1, react: _td('hsRinPML3R2', "Don't tell anyone I comfort people."), expr: 'smirk' }]}
    ]}
  };

  /* ════════════════════════════════════════════════════════════
     MORNING TEXTS — shown on character select cards
     ════════════════════════════════════════════════════════════ */
  var MORNING_TEXTS = {
    hana: [null, _td('hsHanaMorning2', "Don't be late. I warmed up EXTRA."), _td('hsHanaMorning3', "Dreamed I lost to you. Woke up furious."),
      "Bring your A-game. I'm in a mood.", "...Hey. Thanks for yesterday.",
      "Almost texted you last night. Almost.", "Last day. Don't make it easy.",
      "New week. Same fire. Miss me?", "I showed my sister our training schedule. She laughed.",
      "Thunder can't scare me. Much.", "The paddle arrived. It has YOUR initial too.",
      "Today I don't want to compete. Just... be.", "Carved it. No regrets.",
      "14 days. You survived me. Barely."],
    yuki: [null, _td('hsYukiMorning2', "G-good morning! Hope you slept well..."), _td('hsYukiMorning3', "Found a four-leaf clover for you!"),
      "Been smiling all morning. Mom noticed.", "Wrote three poems last night. About... ping pong.",
      "Nervous about today. But the good kind.", "Whatever happens, thank you. For everything.",
      "I hummed in public today! Progress!", "Drew us in my sketchbook. D-don't look!",
      "Rain sounds like tiny ping pong balls \u2665", "Cookies attempt #4. Getting there!",
      "I-I read the whole romance novel...", "Crane #467. Still folding.",
      "Fourteen days and I'm not shaking anymore."],
    rin: [null, _td('hsRinMorning2', "rise and shine superstar~ round 2?"), _td('hsRinMorning3', "wildest dream. you were in it. no details~"),
      "fun fact: thinking about you for 14 hours", "real talk. I missed you. there I said it.",
      "learned a new trick. but I'd rather just talk.", "last day. no tricks. just us.",
      "hat update: still wearing it. no regrets~", "caught being a good person. send help.",
      "bracelet check! still wearing yours?", "sat still for 5 minutes. new record.",
      "the balloon budget was worth it~", "draft 8 of the note. almost honest enough.",
      "fourteen days. zero regrets. one you."]
  };

  /* Ending confessions */
  var ENDINGS = {
    hana: {
      label: _td('hsEndHanaLabel', 'HANA\'S CONFESSION'),
      speech: _td('hsEndHanaSpeech', "\"I'm not good at this. I'm good at winning, not at... feelings. But you... you're the first person who made losing fun. And that terrifies me.\"\n\n*She looks away, ears red*\n\n\"So... same time tomorrow? ...Every tomorrow?\""),
      narration: _td('hsEndHanaNarration', "Hana catches you after the final match. Her grip on the paddle is white-knuckled, but her smile is the softest you've ever seen.")
    },
    yuki: {
      label: _td('hsEndYukiLabel', 'YUKI\'S CONFESSION'),
      speech: _td('hsEndYukiSpeech', "\"I-I wrote something for you... It's every moment that made my heart race. Every serve, every smile, every time you made me brave...\"\n\n*She's shaking but smiling*\n\n\"The last page is blank. Because... I want us to write it together.\""),
      narration: _td('hsEndYukiNarration', "Yuki hands you a small wrapped book, her hands trembling. When you open it, every page is filled with memories of your time together.")
    },
    rin: {
      label: _td('hsEndRinLabel', 'RIN\'S CONFESSION'),
      speech: _td('hsEndRinSpeech', "\"I stopped performing the day you started seeing me.\"\n\n*She's smiling but her eyes are glistening*\n\n\"No jokes. No tricks. You're my favorite person. And I don't say that to anyone.\n\n...Play one more game with me? Just for fun?\""),
      narration: _td('hsEndRinNarration', "The note Rin gave you has just one line. When you look up, her usual mask is gone \u2014 and the real Rin is more beautiful than any trick she's ever pulled.")
    },
    none: {
      label: _td('hsEndNoneLabel', 'SEASON\'S END'),
      speech: _td('hsEndNoneSpeech', "The season is over. You played some good matches and met some interesting people."),
      narration: _td('hsEndNoneNarration', "Maybe next time, you'll get to know someone a little better. The ping pong table will be waiting.")
    },
    hana_friend: {
      label: 'HANA\'S FRIENDSHIP',
      speech: "\"You know what? You're the best training partner I've ever had. And I don't say that lightly.\"\n\n*She punches your shoulder*\n\n\"Same time next season. That's not a request.\"",
      narration: "Hana walks you out after the final match. She's not confessing — but the respect in her eyes says more than words."
    },
    yuki_friend: {
      label: 'YUKI\'S FRIENDSHIP',
      speech: "\"Th-thank you for being my friend. A real one. You taught me that the world isn't as scary as I thought.\"\n\n*She hands you a paper crane*\n\n\"This one's for you. For good luck.\"",
      narration: "Yuki is still shy, but she stands a little taller now. You helped her find her voice, even if romance wasn't in the cards."
    },
    rin_friend: {
      label: 'RIN\'S FRIENDSHIP',
      speech: "\"You know, not everyone gets to see the real me. But you did. And you stuck around anyway.\"\n\n*She grins — the real grin*\n\n\"Keep being weird. The world needs it.\"",
      narration: "Rin drops the act and gives you a genuine hug. Not romantic — but real. And for Rin, real is everything."
    },
    love_triangle: {
      label: 'LOVE TRIANGLE',
      speech: "Two hearts beat for you, and you can hear them both. The air is electric with unspoken words and stolen glances.\n\n\"Choose? How can anyone choose?\"\n\nMaybe... you don't have to. Not today.",
      narration: "The season ends with more questions than answers. Two people care deeply for you, and the heart is a terrible mathematician."
    },
    lonely: {
      label: 'LONELY SEASON',
      speech: "The ping pong table sits empty. The season is over, and the echoes of bouncing balls fade into silence.",
      narration: "You played some matches, but never quite connected. The characters wave goodbye from a distance. Maybe next time, open your heart a little wider."
    }
  };

  /* ════════════════════════════════════════════════════════════
     GIFTS DATA
     ════════════════════════════════════════════════════════════ */
  var GIFTS = {
    energy_drink: { name: 'Energy Drink', emoji: '\u26A1', match: 'hana',
      reaction_match: "You got this for ME?! ...It's my favorite brand. How did you know?!",
      reaction_other: "Oh, uh... thanks? I'm more of a tea person but... I appreciate it!" },
    letter: { name: 'Handwritten Letter', emoji: '\u2709\uFE0F', match: 'yuki',
      reaction_match: "*reads silently, tears forming* Th-this is the most beautiful thing anyone's ever given me...",
      reaction_other: "A letter? That's... sweet. Not really my style but the thought counts~" },
    sticker: { name: 'Lucky Sticker Pack', emoji: '\u2B50', match: 'rin',
      reaction_match: "STICKERS! You KNOW me! I'm putting one on EVERYTHING!",
      reaction_other: "Stickers? Cute, I guess. Not really my thing but... thanks." }
  };
  var GIFT_KEYS = ['energy_drink', 'letter', 'sticker'];

  /* ════════════════════════════════════════════════════════════
     MATCH MODIFIERS (day 5+)
     ════════════════════════════════════════════════════════════ */
  var MATCH_MODIFIERS = [
    { id: 'tiny_ball', name: 'Tiny Ball', emoji: '\uD83D\uDD35', desc: 'Ball is smaller!' },
    { id: 'giant_paddles', name: 'Giant Paddles', emoji: '\uD83C\uDFD3', desc: 'Paddles are huge!' },
    { id: 'lights_out', name: 'Lights Out', emoji: '\uD83C\uDF11', desc: 'Limited visibility!' },
    { id: 'speed_demon', name: 'Speed Demon', emoji: '\uD83D\uDCA8', desc: 'Everything is faster!' }
  ];

  /* ════════════════════════════════════════════════════════════
     DAY EVENTS
     ════════════════════════════════════════════════════════════ */
  var DAY_EVENTS = {
    4: { type: 'tournament', name: 'Tournament Day!', emoji: '\uD83C\uDFC6', desc: 'Play all 3 characters today!' },
    7: { type: 'rainy', name: 'Rainy Day', emoji: '\uD83C\uDF27\uFE0F', desc: 'No matches today — just talking.' },
    10: { type: 'festival', name: 'Festival Day!', emoji: '\uD83C\uDF8A', desc: 'Affection gains \u00D71.5!' },
    13: { type: 'confession_eve', name: 'Confession Eve', emoji: '\uD83D\uDC8C', desc: 'Something is in the air...' }
  };

  /* ════════════════════════════════════════════════════════════
     RIVAL SCENES — triggered when 2 chars within 10 aff of each other (both 25+)
     ════════════════════════════════════════════════════════════ */
  var RIVAL_SCENES = {
    hana_yuki: { text: "Hana spots Yuki near the table. \"Oh, so you're spending time with HER too? Interesting.\" Her eyes narrow.", charKey: 'hana' },
    hana_rin: { text: "Hana catches you laughing with Rin. \"Having fun? Remember who the real competition is.\" She looks hurt.", charKey: 'hana' },
    yuki_hana: { text: "Yuki sees Hana's arm around your shoulder. \"O-oh... you two are close... I see...\" She looks away.", charKey: 'yuki' },
    yuki_rin: { text: "Yuki watches you joking with Rin. \"I-I wish I could be that funny... maybe then you'd...\" She trails off.", charKey: 'yuki' },
    rin_hana: { text: "Rin sees you training with Hana. \"So the fierce one has your attention today? I see how it is~\" Her smile doesn't reach her eyes.", charKey: 'rin' },
    rin_yuki: { text: "Rin catches you with Yuki's bookmark. \"Cute. She made you something. I should try harder, huh?\" She's only half joking.", charKey: 'rin' }
  };

  /* ════════════════════════════════════════════════════════════
     POWER-UPS
     ════════════════════════════════════════════════════════════ */
  var POWERUP_TYPES = [
    { id: 'big_paddle', name: 'Big Paddle', color: '#2196f3', duration: 300, emoji: '\uD83D\uDFE6' },
    { id: 'speed_ball', name: 'Speed Ball', color: '#f44336', duration: 0, emoji: '\uD83D\uDD34' },
    { id: 'freeze', name: 'Freeze', color: '#00bcd4', duration: 120, emoji: '\u2744\uFE0F' },
    { id: 'heart_shot', name: 'Heart Shot', color: '#e91e63', duration: 0, emoji: '\uD83D\uDC96' }
  ];

  /* ════════════════════════════════════════════════════════════
     STATE
     ════════════════════════════════════════════════════════════ */
  var SAVE_KEY = 'heartServeState';
  var GALLERY_KEY = 'heartServeGallery';
  function defaultState() {
    return {
      day: 1,
      affection: { hana: 0, yuki: 0, rin: 0 },
      mood: { hana: 'neutral', yuki: 'neutral', rin: 'neutral' },
      currentChar: null,
      screen: 'title',
      dayHistory: [],
      giftUsed: false,
      giftChar: null,
      festivalActive: false,
      tournamentQueue: null
    };
  }
  var state = loadState();
  function loadState() {
    try { var s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.day) return s; } catch(e) {}
    return defaultState();
  }
  function saveState() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

  /* ════════════════════════════════════════════════════════════
     DOM REFERENCES
     ════════════════════════════════════════════════════════════ */
  function $(id) { return document.getElementById(id); }

  var screens = {
    title: $('titleScreen'), select: $('selectScreen'),
    dialogue: $('dialogueScreen'), match: $('matchScreen'),
    results: $('resultsScreen'), ending: $('endingScreen')
  };

  /* ════════════════════════════════════════════════════════════
     SCREEN MANAGEMENT
     ════════════════════════════════════════════════════════════ */
  var screenTimer = null;
  function showScreen(name) {
    if (screenTimer) { clearTimeout(screenTimer); screenTimer = null; }
    Object.keys(screens).forEach(function(k) {
      var s = screens[k];
      s.classList.remove('active');
      s.style.display = 'none';
      s.style.opacity = '0';
    });
    var next = screens[name];
    next.style.display = 'flex';
    // Force layout so the display change takes before opacity transition
    void next.offsetHeight;
    next.style.opacity = '1';
    next.classList.add('active');
    state.screen = name;
    saveState();
  }

  /* ════════════════════════════════════════════════════════════
     PORTRAIT RENDERER (Canvas chibi characters)
     ════════════════════════════════════════════════════════════ */
  /* ── Color utilities ── */
  function shadeColor(hex, amt) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    r = Math.max(0, Math.min(255, r + amt));
    g = Math.max(0, Math.min(255, g + amt));
    b = Math.max(0, Math.min(255, b + amt));
    return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  function drawMiniStar(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = (i * Math.PI / 2) - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      var a2 = a + Math.PI / 4;
      ctx.lineTo(x + Math.cos(a2) * r * 0.35, y + Math.sin(a2) * r * 0.35);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawHeart(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.15);
    ctx.bezierCurveTo(x - size * 0.5, y + size * 0.45, x, y + size * 0.6, x, y + size * 0.75);
    ctx.bezierCurveTo(x, y + size * 0.6, x + size * 0.5, y + size * 0.45, x + size * 0.5, y + size * 0.15);
    ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  function renderPortrait(canvas, charKey, expression, scale) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var ch = CHARS[charKey];
    if (!ch) return;
    scale = scale || 1;
    var cx = w / 2, cy = h * 0.48;
    var s = Math.min(w, h) * 0.4 * scale;

    // Layered background glow
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 2.2);
    grd.addColorStop(0, ch.colorLight);
    grd.addColorStop(0.5, ch.colorLight + '60');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Decorative sparkles in background
    ctx.globalAlpha = 0.25;
    var sparklePositions = [
      [cx - s*1.2, cy - s*0.8, 4], [cx + s*1.1, cy - s*0.6, 3],
      [cx - s*0.9, cy + s*0.9, 3], [cx + s*1.3, cy + s*0.5, 4],
      [cx - s*0.5, cy - s*1.1, 2.5], [cx + s*0.6, cy - s*1.0, 2.5]
    ];
    sparklePositions.forEach(function(sp) {
      drawMiniStar(ctx, sp[0], sp[1], sp[2], ch.color);
    });
    ctx.globalAlpha = 1;

    // Body with gradient
    var bodyGrd = ctx.createLinearGradient(cx - s * 0.55, cy + s * 0.55, cx + s * 0.55, cy + s * 1.0);
    bodyGrd.addColorStop(0, ch.color);
    bodyGrd.addColorStop(1, shadeColor(ch.color, -30));
    ctx.fillStyle = bodyGrd;
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.9, s * 0.55, s * 0.35, 0, 0, Math.PI);
    ctx.fill();

    // White collar V
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = s * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.12, cy + s * 0.55);
    ctx.lineTo(cx, cy + s * 0.72);
    ctx.lineTo(cx + s * 0.12, cy + s * 0.55);
    ctx.stroke();

    // Neck with shadow
    ctx.fillStyle = ch.skinColor;
    ctx.fillRect(cx - s * 0.1, cy + s * 0.42, s * 0.2, s * 0.18);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.55, s * 0.12, s * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair back (behind head)
    drawHairBack(ctx, charKey, ch, cx, cy, s);

    // Head with gradient shading
    var headGrd = ctx.createRadialGradient(cx - s*0.1, cy - s*0.15, 0, cx, cy, s * 0.5);
    headGrd.addColorStop(0, '#fff');
    headGrd.addColorStop(0.2, ch.skinColor);
    headGrd.addColorStop(1, shadeColor(ch.skinColor, -15));
    ctx.fillStyle = headGrd;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.44, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    [-1, 1].forEach(function(side) {
      ctx.fillStyle = ch.skinColor;
      ctx.beginPath();
      ctx.ellipse(cx + side * s * 0.42, cy + s * 0.02, s * 0.06, s * 0.09, side * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Inner ear
      ctx.fillStyle = 'rgba(255,150,150,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx + side * s * 0.43, cy + s * 0.02, s * 0.03, s * 0.055, side * 0.15, 0, Math.PI * 2);
      ctx.fill();
    });

    // Blush with detail
    var blushAlpha = 0;
    if (expression === 'flustered') blushAlpha = 0.5;
    else if (expression === 'happy') blushAlpha = 0.22;
    else if (expression === 'smirk') blushAlpha = 0.1;
    if (blushAlpha > 0) {
      [-1, 1].forEach(function(side) {
        ctx.fillStyle = 'rgba(255,120,120,' + blushAlpha + ')';
        ctx.beginPath();
        ctx.ellipse(cx + side * s * 0.26, cy + s * 0.12, s * 0.12, s * 0.065, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // Flustered hash lines
      if (expression === 'flustered') {
        ctx.strokeStyle = 'rgba(255,100,100,0.35)';
        ctx.lineWidth = s * 0.015;
        [-1, 1].forEach(function(side) {
          for (var i = 0; i < 3; i++) {
            var bx = cx + side * s * 0.26 - s * 0.04 + i * s * 0.04;
            ctx.beginPath();
            ctx.moveTo(bx - s*0.015, cy + s * 0.10);
            ctx.lineTo(bx + s*0.015, cy + s * 0.14);
            ctx.stroke();
          }
        });
      }
    }

    // Tiny nose
    ctx.fillStyle = 'rgba(180,120,100,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.1, s * 0.025, s * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    drawEyes(ctx, ch, expression, cx, cy, s);

    // Mouth
    drawMouth(ctx, charKey, expression, cx, cy + s * 0.22, s);

    // Hair front
    drawHairFront(ctx, charKey, ch, cx, cy, s);

    // Expression extras
    if (expression === 'happy') {
      ctx.globalAlpha = 0.5;
      drawMiniStar(ctx, cx - s * 0.35, cy - s * 0.3, s * 0.06, '#ffeb3b');
      drawMiniStar(ctx, cx + s * 0.38, cy - s * 0.25, s * 0.05, '#ff8a65');
      ctx.globalAlpha = 1;
    } else if (expression === 'annoyed') {
      // Anger symbol
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = s * 0.025;
      var ax = cx + s * 0.28, ay = cy - s * 0.38;
      ctx.beginPath();
      ctx.moveTo(ax, ay - s*0.04); ctx.lineTo(ax, ay + s*0.04);
      ctx.moveTo(ax - s*0.04, ay); ctx.lineTo(ax + s*0.04, ay);
      ctx.stroke();
    } else if (expression === 'surprised') {
      // Exclamation
      ctx.fillStyle = ch.color;
      ctx.font = 'bold ' + (s * 0.18) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', cx + s * 0.4, cy - s * 0.3);
    }
  }

  function drawEyes(ctx, ch, expr, cx, cy, s) {
    var eyeY = cy - s * 0.05;
    var eyeSpacing = s * 0.18;
    var eyeSize = s * 0.13;

    // Upper eyelashes for all expressions
    function drawLashes(ex, ey, side) {
      ctx.strokeStyle = shadeColor(ch.hairColor, -30);
      ctx.lineWidth = s * 0.015;
      ctx.lineCap = 'round';
      // Top lash line
      ctx.beginPath();
      ctx.arc(ex, ey, eyeSize * 1.05, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      // Corner lashes
      ctx.lineWidth = s * 0.012;
      var lx = ex + side * eyeSize * 0.9;
      ctx.beginPath();
      ctx.moveTo(lx, ey - eyeSize * 0.3);
      ctx.lineTo(lx + side * s * 0.03, ey - eyeSize * 0.6);
      ctx.stroke();
    }

    [-1, 1].forEach(function(side) {
      var ex = cx + side * eyeSpacing;
      if (expr === 'happy' || expr === 'flustered') {
        // Happy arc eyes ^_^
        ctx.strokeStyle = ch.eyeColor;
        ctx.lineWidth = s * 0.045;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeSize * 0.7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        // Cute lower highlight
        ctx.strokeStyle = shadeColor(ch.eyeColor, 40);
        ctx.lineWidth = s * 0.02;
        ctx.beginPath();
        ctx.arc(ex, eyeY + s * 0.01, eyeSize * 0.55, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      } else if (expr === 'annoyed') {
        // Narrow eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeSize * 1.05, eyeSize * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ch.eyeColor;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeSize * 0.65, eyeSize * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeSize * 0.3, eyeSize * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Angry brow
        ctx.strokeStyle = ch.hairColor;
        ctx.lineWidth = s * 0.04;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - eyeSize, eyeY - eyeSize * 1.4 + side * s * 0.05);
        ctx.lineTo(ex + eyeSize, eyeY - eyeSize * 1.4 - side * s * 0.05);
        ctx.stroke();
      } else if (expr === 'surprised') {
        // Big round eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 1.15, 0, Math.PI * 2); ctx.fill();
        // Iris gradient
        var iGrd = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, eyeSize * 0.75);
        iGrd.addColorStop(0, shadeColor(ch.eyeColor, 30));
        iGrd.addColorStop(1, ch.eyeColor);
        ctx.fillStyle = iGrd;
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.38, 0, Math.PI * 2); ctx.fill();
        // Dual highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + eyeSize * 0.25, eyeY - eyeSize * 0.3, eyeSize * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - eyeSize * 0.15, eyeY + eyeSize * 0.15, eyeSize * 0.1, 0, Math.PI * 2); ctx.fill();
        drawLashes(ex, eyeY, side);
      } else if (expr === 'sad') {
        // Droopy eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY + s * 0.02, eyeSize * 0.9, eyeSize * 0.6, side * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ch.eyeColor;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY + s * 0.03, eyeSize * 0.55, eyeSize * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(ex, eyeY + s * 0.03, eyeSize * 0.25, 0, Math.PI * 2); ctx.fill();
        // Sad brow
        ctx.strokeStyle = shadeColor(ch.hairColor, 20);
        ctx.lineWidth = s * 0.025;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - eyeSize, eyeY - eyeSize * 1.2 - side * s * 0.02);
        ctx.lineTo(ex + eyeSize, eyeY - eyeSize * 1.2 + side * s * 0.02);
        ctx.stroke();
      } else {
        // Default / neutral / smirk — rich layered eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
        // Iris gradient
        var iGrd2 = ctx.createRadialGradient(ex, eyeY - eyeSize * 0.1, 0, ex, eyeY, eyeSize * 0.7);
        iGrd2.addColorStop(0, shadeColor(ch.eyeColor, 50));
        iGrd2.addColorStop(0.6, ch.eyeColor);
        iGrd2.addColorStop(1, shadeColor(ch.eyeColor, -20));
        ctx.fillStyle = iGrd2;
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.68, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.32, 0, Math.PI * 2); ctx.fill();
        // Dual highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + eyeSize * 0.22, eyeY - eyeSize * 0.24, eyeSize * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - eyeSize * 0.18, eyeY + eyeSize * 0.12, eyeSize * 0.09, 0, Math.PI * 2); ctx.fill();
        drawLashes(ex, eyeY, side);
        // Smirk: one eye winking
        if (expr === 'smirk' && side === 1) {
          ctx.fillStyle = ch.skinColor;
          ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 1.15, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = ch.eyeColor;
          ctx.lineWidth = s * 0.035;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeSize * 0.6, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
          // Wink lash
          ctx.lineWidth = s * 0.015;
          ctx.beginPath();
          ctx.moveTo(ex + eyeSize * 0.5, eyeY - eyeSize * 0.15);
          ctx.lineTo(ex + eyeSize * 0.7, eyeY - eyeSize * 0.45);
          ctx.stroke();
        }
      }
    });
  }

  function drawMouth(ctx, charKey, expr, mx, my, s) {
    ctx.lineCap = 'round';
    if (expr === 'happy') {
      // Big open smile
      ctx.fillStyle = '#9e6b5a';
      ctx.beginPath();
      ctx.arc(mx, my - s * 0.01, s * 0.09, 0.05, Math.PI - 0.05);
      ctx.fill();
      // Tongue hint
      ctx.fillStyle = '#e87070';
      ctx.beginPath();
      ctx.ellipse(mx, my + s * 0.04, s * 0.04, s * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'smirk') {
      // Cat mouth ω
      ctx.strokeStyle = '#9e6b5a';
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(mx - s * 0.08, my - s * 0.01);
      ctx.quadraticCurveTo(mx - s * 0.03, my + s * 0.04, mx, my);
      ctx.quadraticCurveTo(mx + s * 0.03, my + s * 0.04, mx + s * 0.08, my - s * 0.01);
      ctx.stroke();
      // One-sided smirk lift
      ctx.beginPath();
      ctx.moveTo(mx + s * 0.08, my - s * 0.01);
      ctx.lineTo(mx + s * 0.1, my - s * 0.03);
      ctx.stroke();
    } else if (expr === 'flustered') {
      // Wavy embarrassed mouth
      ctx.strokeStyle = '#c0756a';
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(mx - s * 0.08, my);
      ctx.quadraticCurveTo(mx - s * 0.04, my + s * 0.04, mx, my);
      ctx.quadraticCurveTo(mx + s * 0.04, my - s * 0.04, mx + s * 0.08, my);
      ctx.stroke();
    } else if (expr === 'surprised') {
      // Open O mouth
      ctx.fillStyle = '#9e6b5a';
      ctx.beginPath();
      ctx.ellipse(mx, my + s * 0.02, s * 0.055, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner
      ctx.fillStyle = '#e87070';
      ctx.beginPath();
      ctx.ellipse(mx, my + s * 0.03, s * 0.035, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'annoyed') {
      // Tight frown
      ctx.strokeStyle = '#8e5b4a';
      ctx.lineWidth = s * 0.028;
      ctx.beginPath();
      ctx.moveTo(mx - s * 0.07, my);
      ctx.lineTo(mx + s * 0.07, my + s * 0.01);
      ctx.stroke();
      // Tiny fang for Rin
      if (charKey === 'rin') {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(mx + s * 0.02, my);
        ctx.lineTo(mx + s * 0.035, my + s * 0.03);
        ctx.lineTo(mx + s * 0.05, my);
        ctx.fill();
      }
    } else if (expr === 'sad') {
      ctx.strokeStyle = '#9e6b5a';
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.arc(mx, my + s * 0.07, s * 0.08, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    } else {
      // Neutral slight smile
      ctx.strokeStyle = '#9e6b5a';
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.arc(mx, my, s * 0.07, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }

  function drawHairBack(ctx, key, ch, cx, cy, s) {
    ctx.fillStyle = ch.hairColor;
    if (key === 'hana') {
      // Short spiky back with volume
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.08, s * 0.52, s * 0.57, 0, 0, Math.PI * 2);
      ctx.fill();
      // Extra spiky tips
      ctx.fillStyle = shadeColor(ch.hairColor, -15);
      var tips = [[-0.4, -0.45], [-0.15, -0.55], [0.2, -0.52], [0.42, -0.4]];
      tips.forEach(function(t) {
        ctx.beginPath();
        ctx.moveTo(cx + s * t[0], cy + s * t[1]);
        ctx.lineTo(cx + s * (t[0] + 0.05), cy + s * (t[1] - 0.12));
        ctx.lineTo(cx + s * (t[0] + 0.1), cy + s * t[1]);
        ctx.fill();
      });
    } else if (key === 'yuki') {
      // Long flowing hair behind with gradient
      var hairGrd = ctx.createLinearGradient(cx, cy - s * 0.2, cx, cy + s * 1.1);
      hairGrd.addColorStop(0, ch.hairColor);
      hairGrd.addColorStop(1, shadeColor(ch.hairColor, -25));
      ctx.fillStyle = hairGrd;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.48, cy - s * 0.2);
      ctx.quadraticCurveTo(cx - s * 0.58, cy + s * 0.5, cx - s * 0.4, cy + s * 1.05);
      ctx.quadraticCurveTo(cx - s * 0.2, cy + s * 1.15, cx, cy + s * 1.05);
      ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 1.15, cx + s * 0.4, cy + s * 1.05);
      ctx.quadraticCurveTo(cx + s * 0.58, cy + s * 0.5, cx + s * 0.48, cy - s * 0.2);
      ctx.fill();
      // Wavy strands
      ctx.strokeStyle = ch.hairHighlight;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = s * 0.02;
      [[-0.3, 0.2, -0.35, 0.85], [0.0, 0.1, -0.05, 0.9], [0.3, 0.2, 0.35, 0.85]].forEach(function(strand) {
        ctx.beginPath();
        ctx.moveTo(cx + s * strand[0], cy + s * strand[1]);
        ctx.quadraticCurveTo(cx + s * (strand[0] + 0.08), cy + s * (strand[1] + 0.3), cx + s * strand[2], cy + s * strand[3]);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    } else if (key === 'rin') {
      // Twin tail base
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.05, s * 0.5, s * 0.54, 0, 0, Math.PI * 2);
      ctx.fill();
      // Twin tails with gradient
      [-1, 1].forEach(function(side) {
        var tailGrd = ctx.createLinearGradient(cx + side * s * 0.35, cy, cx + side * s * 0.55, cy + s * 0.9);
        tailGrd.addColorStop(0, ch.hairColor);
        tailGrd.addColorStop(1, shadeColor(ch.hairColor, -20));
        ctx.fillStyle = tailGrd;
        ctx.beginPath();
        ctx.moveTo(cx + side * s * 0.35, cy - s * 0.15);
        ctx.quadraticCurveTo(cx + side * s * 0.72, cy + s * 0.05, cx + side * s * 0.6, cy + s * 0.5);
        ctx.quadraticCurveTo(cx + side * s * 0.55, cy + s * 0.85, cx + side * s * 0.4, cy + s * 0.75);
        ctx.quadraticCurveTo(cx + side * s * 0.5, cy + s * 0.55, cx + side * s * 0.45, cy + s * 0.3);
        ctx.quadraticCurveTo(cx + side * s * 0.35, cy + s * 0.1, cx + side * s * 0.3, cy - s * 0.05);
        ctx.fill();
        // Tail highlight
        ctx.strokeStyle = ch.hairHighlight;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = s * 0.03;
        ctx.beginPath();
        ctx.moveTo(cx + side * s * 0.42, cy + s * 0.1);
        ctx.quadraticCurveTo(cx + side * s * 0.55, cy + s * 0.35, cx + side * s * 0.48, cy + s * 0.6);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
  }

  function drawHairFront(ctx, key, ch, cx, cy, s) {
    ctx.fillStyle = ch.hairColor;
    if (key === 'hana') {
      // Spiky bangs with more detail
      var bangs = [[-0.35, -0.4], [-0.22, -0.57], [-0.08, -0.45], [0.05, -0.6], [0.18, -0.48], [0.32, -0.42], [0.4, -0.36]];
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.46, cy - s * 0.15);
      bangs.forEach(function(p) { ctx.lineTo(cx + s * p[0], cy + s * p[1]); });
      ctx.lineTo(cx + s * 0.46, cy - s * 0.15);
      ctx.quadraticCurveTo(cx + s * 0.52, cy - s * 0.35, cx + s * 0.36, cy - s * 0.54);
      ctx.quadraticCurveTo(cx, cy - s * 0.67, cx - s * 0.36, cy - s * 0.54);
      ctx.quadraticCurveTo(cx - s * 0.52, cy - s * 0.35, cx - s * 0.46, cy - s * 0.15);
      ctx.fill();
      // Gradient highlight streak
      ctx.fillStyle = ch.hairHighlight;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.1, cy - s * 0.46, s * 0.14, s * 0.065, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Second smaller highlight
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.15, cy - s * 0.4, s * 0.08, s * 0.04, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Headband
      ctx.strokeStyle = shadeColor(ch.color, 30);
      ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.1, s * 0.46, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (key === 'yuki') {
      // Soft bangs with side-swept fringe — more strands
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.47, cy - s * 0.1);
      ctx.quadraticCurveTo(cx - s * 0.46, cy - s * 0.33, cx - s * 0.32, cy - s * 0.2);
      ctx.quadraticCurveTo(cx - s * 0.25, cy - s * 0.36, cx - s * 0.12, cy - s * 0.22);
      ctx.quadraticCurveTo(cx - s * 0.02, cy - s * 0.38, cx + s * 0.08, cy - s * 0.24);
      ctx.quadraticCurveTo(cx + s * 0.18, cy - s * 0.4, cx + s * 0.28, cy - s * 0.2);
      ctx.quadraticCurveTo(cx + s * 0.38, cy - s * 0.34, cx + s * 0.47, cy - s * 0.1);
      ctx.quadraticCurveTo(cx + s * 0.52, cy - s * 0.42, cx + s * 0.36, cy - s * 0.57);
      ctx.quadraticCurveTo(cx, cy - s * 0.7, cx - s * 0.36, cy - s * 0.57);
      ctx.quadraticCurveTo(cx - s * 0.52, cy - s * 0.42, cx - s * 0.47, cy - s * 0.1);
      ctx.fill();
      // Side hair strands — longer, with curve
      [-1, 1].forEach(function(side) {
        ctx.fillStyle = ch.hairColor;
        ctx.beginPath();
        ctx.moveTo(cx + side * s * 0.45, cy - s * 0.1);
        ctx.quadraticCurveTo(cx + side * s * 0.52, cy + s * 0.15, cx + side * s * 0.44, cy + s * 0.42);
        ctx.quadraticCurveTo(cx + side * s * 0.42, cy + s * 0.48, cx + side * s * 0.36, cy + s * 0.45);
        ctx.lineTo(cx + side * s * 0.36, cy + s * 0.38);
        ctx.quadraticCurveTo(cx + side * s * 0.42, cy + s * 0.1, cx + side * s * 0.39, cy - s * 0.05);
        ctx.fill();
      });
      // Highlight streaks
      ctx.fillStyle = ch.hairHighlight;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.06, cy - s * 0.44, s * 0.13, s * 0.05, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.18, cy - s * 0.38, s * 0.08, s * 0.035, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Hair clip (star shape)
      ctx.fillStyle = '#e1bee7';
      drawMiniStar(ctx, cx + s * 0.36, cy - s * 0.18, s * 0.06, '#e1bee7');
    } else if (key === 'rin') {
      // Messy bangs with middle part — more wild
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.45, cy - s * 0.08);
      ctx.lineTo(cx - s * 0.33, cy - s * 0.26);
      ctx.lineTo(cx - s * 0.2, cy - s * 0.16);
      ctx.lineTo(cx - s * 0.1, cy - s * 0.3);
      ctx.lineTo(cx - s * 0.02, cy - s * 0.34);
      ctx.lineTo(cx + s * 0.02, cy - s * 0.34);
      ctx.lineTo(cx + s * 0.1, cy - s * 0.3);
      ctx.lineTo(cx + s * 0.2, cy - s * 0.16);
      ctx.lineTo(cx + s * 0.33, cy - s * 0.26);
      ctx.lineTo(cx + s * 0.45, cy - s * 0.08);
      ctx.quadraticCurveTo(cx + s * 0.52, cy - s * 0.36, cx + s * 0.34, cy - s * 0.57);
      ctx.quadraticCurveTo(cx, cy - s * 0.68, cx - s * 0.34, cy - s * 0.57);
      ctx.quadraticCurveTo(cx - s * 0.52, cy - s * 0.36, cx - s * 0.45, cy - s * 0.08);
      ctx.fill();
      // Stray strand (ahoge)
      ctx.strokeStyle = ch.hairColor;
      ctx.lineWidth = s * 0.03;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.55);
      ctx.quadraticCurveTo(cx + s * 0.08, cy - s * 0.78, cx + s * 0.12, cy - s * 0.7);
      ctx.stroke();
      // Ribbon bows — more detailed with center knot
      [-1, 1].forEach(function(side) {
        var bx = cx + side * s * 0.4, by = cy - s * 0.25;
        // Bow loops
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.ellipse(bx - side * s * 0.04, by - s * 0.02, s * 0.06, s * 0.035, side * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + side * s * 0.04, by + s * 0.02, s * 0.06, s * 0.035, side * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Center knot
        ctx.fillStyle = '#fdd835';
        ctx.beginPath();
        ctx.arc(bx, by, s * 0.025, 0, Math.PI * 2);
        ctx.fill();
        // Ribbon tails
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.moveTo(bx, by + s * 0.02);
        ctx.lineTo(bx - side * s * 0.02, by + s * 0.1);
        ctx.lineTo(bx + side * s * 0.01, by + s * 0.03);
        ctx.fill();
      });
      // Highlight
      ctx.fillStyle = ch.hairHighlight;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.12, cy - s * 0.42, s * 0.11, s * 0.04, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* ════════════════════════════════════════════════════════════
     PARTICLE SYSTEM — floating hearts
     ════════════════════════════════════════════════════════════ */
  var particles = [];
  var particleCanvas = $('particleCanvas');
  var pCtx = particleCanvas ? particleCanvas.getContext('2d') : null;

  function resizeParticleCanvas() {
    if (!particleCanvas) return;
    var rect = particleCanvas.parentElement.getBoundingClientRect();
    particleCanvas.width = rect.width;
    particleCanvas.height = rect.height;
  }
  window.addEventListener('resize', resizeParticleCanvas);
  resizeParticleCanvas();

  function spawnHeart(x, y, count) {
    for (var i = 0; i < (count || 1); i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        size: 8 + Math.random() * 10,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.1
      });
    }
  }

  function spawnSparkles(x, y, count) {
    for (var i = 0; i < (count || 5); i++) {
      particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 3 + Math.random() * 4,
        alpha: 1,
        isStar: true,
        color: ['#ff6b9d', '#b388ff', '#ffeb3b', '#ff8a65'][Math.floor(Math.random() * 4)]
      });
    }
  }

  function updateParticles() {
    if (!pCtx) return;
    pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.015;
      if (p.rotation !== undefined) p.rotation += p.spin || 0;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      pCtx.save();
      pCtx.globalAlpha = p.alpha;
      pCtx.translate(p.x, p.y);
      if (p.isStar) {
        // Proper 4-point star
        pCtx.fillStyle = p.color || '#ffeb3b';
        pCtx.beginPath();
        for (var j = 0; j < 8; j++) {
          var a = (j * Math.PI / 4) - Math.PI / 2;
          var r = j % 2 === 0 ? p.size : p.size * 0.35;
          pCtx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        pCtx.closePath();
        pCtx.fill();
        // Glow
        pCtx.globalAlpha = p.alpha * 0.3;
        pCtx.beginPath();
        pCtx.arc(0, 0, p.size * 1.5, 0, Math.PI * 2);
        pCtx.fillStyle = p.color || '#ffeb3b';
        pCtx.fill();
      } else {
        // Draw actual heart shape instead of text
        if (p.rotation !== undefined) pCtx.rotate(p.rotation);
        var hs = p.size * 0.5;
        var hColors = ['#ff1744', '#ff4081', '#e91e63', '#f06292'];
        pCtx.fillStyle = p.color || hColors[Math.floor(i % 4)];
        pCtx.beginPath();
        pCtx.moveTo(0, hs * 0.35);
        pCtx.bezierCurveTo(0, 0, -hs, 0, -hs, hs * 0.35);
        pCtx.bezierCurveTo(-hs, hs * 0.75, 0, hs, 0, hs * 1.2);
        pCtx.bezierCurveTo(0, hs, hs, hs * 0.75, hs, hs * 0.35);
        pCtx.bezierCurveTo(hs, 0, 0, 0, 0, hs * 0.35);
        pCtx.fill();
        // Heart shine
        pCtx.fillStyle = 'rgba(255,255,255,0.4)';
        pCtx.beginPath();
        pCtx.ellipse(-hs * 0.3, hs * 0.25, hs * 0.15, hs * 0.1, -0.3, 0, Math.PI * 2);
        pCtx.fill();
      }
      pCtx.restore();
    }
  }
  setInterval(updateParticles, 1000 / 30);

  /* ════════════════════════════════════════════════════════════
     AFFECTION SYSTEM
     ════════════════════════════════════════════════════════════ */
  function addAffection(charKey, amount) {
    state.affection[charKey] = Math.max(0, Math.min(MAX_AFFECTION, (state.affection[charKey] || 0) + amount));
    saveState();
    if (amount > 0 && typeof HSAudio !== 'undefined') HSAudio.heartGain();
  }

  function getAffectionLevel(charKey) {
    var a = state.affection[charKey] || 0;
    if (a >= 60) return 5;
    if (a >= 45) return 4;
    if (a >= 30) return 3;
    if (a >= 15) return 2;
    if (a >= 5) return 1;
    return 0;
  }

  function renderHeartPips(container, charKey) {
    var lvl = getAffectionLevel(charKey);
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += '<span class="heart-pip ' + (i < lvl ? 'filled' : 'empty') + '">\u2665</span>';
    }
    container.innerHTML = html;
  }

  function totalAffection() {
    return (state.affection.hana || 0) + (state.affection.yuki || 0) + (state.affection.rin || 0);
  }

  /* ════════════════════════════════════════════════════════════
     TITLE SCREEN
     ════════════════════════════════════════════════════════════ */
  $('startBtn').addEventListener('click', function() {
    if (typeof HSAudio !== 'undefined') HSAudio.click();
    state = defaultState();
    saveState();
    goToSelect();
  });

  $('continueBtn').addEventListener('click', function() {
    if (typeof HSAudio !== 'undefined') HSAudio.click();
    goToSelect();
  });

  function initTitle() {
    // Show continue if save exists
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch(e) {}
    if (saved && saved.day && saved.day > 1) {
      $('continueBtn').style.display = '';
    }

    // Mute button
    var muteBtn = $('muteBtn');
    if (muteBtn) {
      muteBtn.textContent = (typeof HSAudio !== 'undefined' && HSAudio.isMuted()) ? '\u{1F507}' : '\u{1F50A}';
      muteBtn.onclick = function() {
        if (typeof HSAudio !== 'undefined') {
          var m = HSAudio.toggleMute();
          muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
        }
      };
    }

    // Ending gallery
    var galleryEl = $('endingGallery');
    if (galleryEl) {
      var gallery = loadGallery();
      var allEndings = ['hana', 'yuki', 'rin', 'hana_friend', 'yuki_friend', 'rin_friend', 'love_triangle', 'lonely'];
      galleryEl.innerHTML = '';
      var anyUnlocked = false;
      allEndings.forEach(function(ek) {
        var slot = document.createElement('div');
        slot.className = 'gallery-slot' + (gallery.indexOf(ek) >= 0 ? ' unlocked' : '');
        if (gallery.indexOf(ek) >= 0) {
          anyUnlocked = true;
          var ending = ENDINGS[ek];
          slot.textContent = ending ? ending.label : ek;
          slot.title = ending ? ending.label : ek;
        } else {
          slot.textContent = '?';
          slot.title = 'Not yet unlocked';
        }
        galleryEl.appendChild(slot);
      });
      galleryEl.parentElement.style.display = anyUnlocked ? '' : 'none';
    }
  }

  /* ════════════════════════════════════════════════════════════
     CHARACTER SELECT
     ════════════════════════════════════════════════════════════ */
  /* ── Jealousy drain: neglected characters lose -1 per day ── */
  function applyJealousyDrain() {
    if (state.day <= 1) return;
    var visited = state.currentChar;
    CHAR_KEYS.forEach(function(k) {
      if (k !== visited && (state.affection[k] || 0) > 0) {
        state.affection[k] = Math.max(0, (state.affection[k] || 0) - 1);
        // Set jealous mood if they had significant affection
        if ((state.affection[k] || 0) >= 15) {
          state.mood[k] = 'jealous';
        }
      }
    });
    saveState();
  }

  /* ── Check for rival scenes ── */
  function checkRivalScene() {
    if (!state.currentChar) return null;
    var current = state.currentChar;
    var currentAff = state.affection[current] || 0;
    if (currentAff < 25) return null;
    for (var i = 0; i < CHAR_KEYS.length; i++) {
      var other = CHAR_KEYS[i];
      if (other === current) continue;
      var otherAff = state.affection[other] || 0;
      if (otherAff >= 25 && Math.abs(currentAff - otherAff) <= 10) {
        var key = other + '_' + current;
        if (RIVAL_SCENES[key]) return RIVAL_SCENES[key];
      }
    }
    return null;
  }

  /* ── Mood emoji badge ── */
  function getMoodEmoji(charKey) {
    var mood = (state.mood && state.mood[charKey]) || 'neutral';
    if (mood === 'happy') return '\uD83D\uDE0A';
    if (mood === 'fired_up') return '\uD83D\uDD25';
    if (mood === 'vulnerable') return '\uD83E\uDD7A';
    if (mood === 'jealous') return '\uD83D\uDE12';
    return '';
  }

  /* ── Festival multiplier ── */
  function getAffectionMultiplier() {
    var ev = DAY_EVENTS[state.day];
    return (ev && ev.type === 'festival') ? 1.5 : 1;
  }

  function goToSelect() {
    showScreen('select');
    $('dayBadge').textContent = _t('hsDay') + ' ' + state.day;

    // Show day event banner if applicable
    var dayEvent = DAY_EVENTS[state.day];
    var eventBanner = $('dayEventBanner');
    if (eventBanner) {
      if (dayEvent) {
        eventBanner.textContent = dayEvent.emoji + ' ' + dayEvent.name + ' — ' + dayEvent.desc;
        eventBanner.style.display = '';
        if (typeof HSAudio !== 'undefined') HSAudio.eventFanfare();
      } else {
        eventBanner.style.display = 'none';
      }
    }

    // Gift button (after day 3, if not used)
    var giftBtn = $('giftBtn');
    if (giftBtn) {
      giftBtn.style.display = (state.day > 3 && !state.giftUsed) ? '' : 'none';
    }

    renderSelectCards();
    renderTopAffection();
  }

  function renderTopAffection() {
    var bar = $('topAffectionBar');
    bar.innerHTML = '';
    CHAR_KEYS.forEach(function(k) {
      var ch = CHARS[k];
      var d = document.createElement('div');
      d.className = 'aff-mini';
      d.innerHTML = '<span class="aff-mini-dot" style="background:' + ch.color + '"></span>' +
        '<span style="color:' + ch.color + '">' + ch.name.split(' ')[0] + '</span> ' +
        '<span>' + (state.affection[k] || 0) + '</span>';
      bar.appendChild(d);
    });
  }

  function renderSelectCards() {
    var grid = $('charGrid');
    grid.innerHTML = '';
    CHAR_KEYS.forEach(function(k) {
      var ch = CHARS[k];
      var card = document.createElement('div');
      card.className = 'char-card';
      card.setAttribute('data-char', k);
      var canvas = document.createElement('canvas');
      canvas.width = 150; canvas.height = 200;
      canvas.className = 'char-card-canvas';
      card.appendChild(canvas);
      var nameDiv = document.createElement('div');
      nameDiv.className = 'char-card-name';
      nameDiv.style.color = ch.color;
      nameDiv.textContent = ch.name.split(' ')[0];
      card.appendChild(nameDiv);
      var titleDiv = document.createElement('div');
      titleDiv.className = 'char-card-title';
      titleDiv.textContent = ch.title;
      card.appendChild(titleDiv);
      // Mood badge
      var moodEmoji = getMoodEmoji(k);
      if (moodEmoji) {
        var moodBadge = document.createElement('div');
        moodBadge.className = 'mood-badge';
        moodBadge.textContent = moodEmoji;
        card.appendChild(moodBadge);
      }
      var hearts = document.createElement('div');
      hearts.className = 'char-card-hearts';
      renderHeartPips(hearts, k);
      card.appendChild(hearts);
      // Morning text message
      var morningMsg = MORNING_TEXTS[k] && MORNING_TEXTS[k][state.day - 1];
      if (morningMsg) {
        var msgDiv = document.createElement('div');
        msgDiv.className = 'char-card-msg';
        msgDiv.textContent = '\u{1F4AC} ' + morningMsg;
        card.appendChild(msgDiv);
      }
      grid.appendChild(card);
      renderPortrait(canvas, k, 'happy', 0.85);
      card.addEventListener('click', function() { selectCharacter(k); });
    });
  }

  function selectCharacter(charKey) {
    if (typeof HSAudio !== 'undefined') HSAudio.click();
    state.currentChar = charKey;
    state.dayHistory.push(charKey);
    saveState();
    startDialogue(charKey);
  }

  /* ── Gift giving flow ── */
  function showGiftModal() {
    var modal = $('giftModal');
    if (!modal) return;
    modal.style.display = 'flex';
    var list = $('giftList');
    if (!list) return;
    list.innerHTML = '';
    GIFT_KEYS.forEach(function(gk) {
      var g = GIFTS[gk];
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = g.emoji + ' ' + g.name;
      btn.addEventListener('click', function() { giveGift(gk); });
      list.appendChild(btn);
    });
  }

  function giveGift(giftKey) {
    var modal = $('giftModal');
    if (modal) modal.style.display = 'none';
    if (!state.currentChar || state.giftUsed) return;
    var gift = GIFTS[giftKey];
    var charKey = state.currentChar;
    var isMatch = gift.match === charKey;
    var affGain = isMatch ? 8 : 3;
    var mult = getAffectionMultiplier();
    addAffection(charKey, Math.round(affGain * mult));
    state.giftUsed = true;
    state.giftChar = charKey;
    saveState();
    if (typeof HSAudio !== 'undefined') HSAudio.giftGive();
    // Show gift reaction in dialogue
    var reaction = isMatch ? gift.reaction_match : gift.reaction_other;
    $('dialogueText').textContent = reaction;
    $('dialogueSpeaker').textContent = CHARS[charKey].name.split(' ')[0];
    renderPortrait($('portraitCanvas'), charKey, isMatch ? 'happy' : 'surprised');
    $('reactionBox').textContent = (isMatch ? '\u2665 +8' : '+3') + ' affection!';
    $('reactionBox').classList.add('visible');
    var gcRect = $('gameContainer').getBoundingClientRect();
    spawnHeart(gcRect.width / 2, gcRect.height / 3, isMatch ? 8 : 3);
  }

  /* ════════════════════════════════════════════════════════════
     DIALOGUE SYSTEM
     ════════════════════════════════════════════════════════════ */
  function startDialogue(charKey) {
    showScreen('dialogue');
    var ch = CHARS[charKey];
    var dayIdx = Math.min(state.day - 1, DIALOGUE[charKey].length - 1);
    var d = DIALOGUE[charKey][dayIdx];

    // Check for rival scene first
    var rival = checkRivalScene();
    if (rival && !state._rivalShown) {
      state._rivalShown = true;
      renderPortrait($('portraitCanvas'), rival.charKey, 'annoyed');
      $('charNameplate').textContent = CHARS[rival.charKey].name;
      $('charNameplate').style.color = CHARS[rival.charKey].color;
      $('sceneText').textContent = '';
      $('dialogueSpeaker').textContent = CHARS[rival.charKey].name.split(' ')[0];
      $('dialogueSpeaker').style.color = CHARS[rival.charKey].color;
      $('dialogueText').textContent = rival.text;
      $('reactionBox').classList.remove('visible');
      if (typeof HSAudio !== 'undefined') HSAudio.jealousy();
      var panel = $('choicesPanel');
      panel.innerHTML = '';
      var continueBtn = document.createElement('button');
      continueBtn.className = 'btn btn-primary';
      continueBtn.textContent = 'Continue...';
      continueBtn.addEventListener('click', function() {
        state._rivalShown = false;
        startDialogueInner(charKey, dayIdx, d);
      });
      panel.appendChild(continueBtn);
      return;
    }
    state._rivalShown = false;
    startDialogueInner(charKey, dayIdx, d);
  }

  function startDialogueInner(charKey, dayIdx, d) {
    var ch = CHARS[charKey];

    // Render portrait
    renderPortrait($('portraitCanvas'), charKey, 'neutral');

    // Nameplate
    $('charNameplate').textContent = ch.name;
    $('charNameplate').style.color = ch.color;

    // Scene
    $('sceneText').textContent = d.scene;

    // Dialogue
    $('dialogueSpeaker').textContent = ch.name.split(' ')[0];
    $('dialogueSpeaker').style.color = ch.color;
    $('dialogueText').textContent = d.text;

    // Choices
    var panel = $('choicesPanel');
    panel.innerHTML = '';
    $('reactionBox').classList.remove('visible');
    $('reactionBox').textContent = '';

    d.choices.forEach(function(choice, i) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', function() { handleChoice(charKey, dayIdx, i); });
      panel.appendChild(btn);
    });

    // Secret 4th choice at affection level 4+
    if (getAffectionLevel(charKey) >= 4) {
      var secretChoice = getSecretChoice(charKey, dayIdx);
      if (secretChoice) {
        var secretBtn = document.createElement('button');
        secretBtn.className = 'choice-btn choice-btn-secret';
        secretBtn.textContent = '\u2665 ' + secretChoice.text;
        secretBtn.addEventListener('click', function() {
          if (typeof HSAudio !== 'undefined') HSAudio.click();
          applyChoice(charKey, secretChoice);
          followupStep = 0;
          showFollowupOrMatch(charKey, dayIdx);
        });
        panel.appendChild(secretBtn);
      }
    }

    // Gift button in dialogue if available
    if (state.day > 3 && !state.giftUsed) {
      var gBtn = document.createElement('button');
      gBtn.className = 'btn btn-secondary';
      gBtn.style.marginTop = '8px';
      gBtn.textContent = '\uD83C\uDF81 Give a Gift';
      gBtn.addEventListener('click', function() { showGiftModal(); });
      panel.appendChild(gBtn);
    }
  }

  function getSecretChoice(charKey, dayIdx) {
    var secrets = {
      hana: [
        { text: "You're the only one I want to play against.", aff: 4, react: "*goes completely red* ...Game. ON.", expr: 'flustered' },
        { text: "I can't stop thinking about our matches.", aff: 4, react: "Matches. Right. That's what you're thinking about.", expr: 'flustered' },
        { text: "I came here just to see your smile.", aff: 4, react: "My SMILE?! I DON'T SMILE! ...okay maybe around you.", expr: 'flustered' },
        { text: "Your passion makes my heart race.", aff: 4, react: "Your HEART?! Can we talk about ANYTHING else?!", expr: 'flustered' },
        { text: "I'd let you win just to see you happy.", aff: 4, react: "Don't you DARE. Win because you're worthy.", expr: 'flustered' },
        { text: "You're beautiful when you're fired up.", aff: 4, react: "B-BEAUTIFUL?! I'm leaving. I'm LEAVING. ...I'm not leaving.", expr: 'flustered' },
        { text: "Every day with you is my favorite day.", aff: 4, react: "...Mine too. Now I'm REALLY going to beat you.", expr: 'flustered' },
        { text: "I'm falling for you, Hana.", aff: 4, react: "*drops paddle* ...Pick that up. We're not done.", expr: 'flustered' },
        { text: "Let's never stop being rivals.", aff: 4, react: "Rivals. Partners. Whatever we are... don't stop.", expr: 'flustered' },
        { text: "I want every tomorrow with you.", aff: 4, react: "...Every single one.", expr: 'happy' },
        { text: "The championship doesn't matter. You do.", aff: 4, react: "Don't say that. I'll cry. Champions DON'T cry.", expr: 'flustered' },
        { text: "You had me at 'prepare to lose.'", aff: 4, react: "DAY ONE?! You've been holding this in since DAY ONE?!", expr: 'flustered' },
        { text: "Win or lose, you're my champion.", aff: 4, react: "...I don't have a comeback. You broke me.", expr: 'flustered' },
        { text: "I'd cross any court for you.", aff: 4, react: "...Then let's play the final match. Together. Forever.", expr: 'happy' }
      ],
      yuki: [
        { text: "Your shyness is the bravest thing I've ever seen.", aff: 4, react: "*tears up immediately* N-no one's ever called me brave...", expr: 'flustered' },
        { text: "I want to read every poem you've ever written.", aff: 4, react: "E-every one?! They're all about... y-you know what, never mind!", expr: 'flustered' },
        { text: "The world is better because you're in it.", aff: 4, react: "*completely frozen* ...Say that again. Please.", expr: 'flustered' },
        { text: "I'd read a thousand books if you recommended them.", aff: 4, react: "I-I have a list! A very long, very passionate list!", expr: 'happy' },
        { text: "Your voice is my favorite sound.", aff: 4, react: "M-my voice?! I always thought it was too quiet...", expr: 'flustered' },
        { text: "Being with you feels like coming home.", aff: 4, react: "*holds your hand* H-home... I like that word with you.", expr: 'flustered' },
        { text: "You make the world less scary for me too.", aff: 4, react: "W-we make each other brave! That's... that's everything!", expr: 'happy' },
        { text: "I wrote something for you too.", aff: 4, react: "*gasps* Y-you WRITE?! Show me! Please please please!", expr: 'happy' },
        { text: "Every crane you fold makes me fall harder.", aff: 4, react: "F-fall?! Like... fall fall? The romantic kind of fall?!", expr: 'flustered' },
        { text: "I want to be in every chapter of your story.", aff: 4, react: "You already are... you're the main character.", expr: 'flustered' },
        { text: "Your smile could light up the whole school.", aff: 4, react: "*hides face* S-stop! My heart can't handle this!", expr: 'flustered' },
        { text: "I'd fold the next 1000 cranes with you.", aff: 4, react: "T-together?! *grabs origami paper* Let's start RIGHT NOW!", expr: 'happy' },
        { text: "You deserve someone who sees how incredible you are.", aff: 4, react: "...I found that someone. They're standing right here.", expr: 'flustered' },
        { text: "I love who I become when I'm with you.", aff: 4, react: "M-me too. You become... mine. I-I MEAN YOURSELF!", expr: 'flustered' }
      ],
      rin: [
        { text: "Your real laugh is the best sound in the universe.", aff: 4, react: "...That's the first time someone preferred the real version.", expr: 'flustered' },
        { text: "I see through every trick because I can't look away.", aff: 4, react: "Okay that was SMOOTH. I'm stealing that line.", expr: 'flustered' },
        { text: "Chaos has never been this beautiful.", aff: 4, react: "BEAUTIFUL chaos? That's my brand. And you're my muse~", expr: 'flustered' },
        { text: "I'd let you prank me forever.", aff: 4, react: "Forever is a long time... *softly* ...I'd take it.", expr: 'flustered' },
        { text: "You don't need tricks. You had me from the start.", aff: 4, react: "From the START?! All my scheming was unnecessary?!", expr: 'flustered' },
        { text: "I want to be the person you don't perform for.", aff: 4, react: "You already are. That's what scares me.", expr: 'flustered' },
        { text: "Every version of you is my favorite.", aff: 4, react: "Even the messy ones? The scared ones? ...Okay. All in.", expr: 'happy' },
        { text: "You're the plot twist I never saw coming.", aff: 4, react: "The BEST kind of plot twist. The kind that changes everything.", expr: 'flustered' },
        { text: "I'd rewrite every joke just to hear you laugh.", aff: 4, react: "Don't rewrite anything. You're perfect as-is.", expr: 'flustered' },
        { text: "Take off the mask. I'll catch whatever's underneath.", aff: 4, react: "...You already caught it. A long time ago.", expr: 'happy' },
        { text: "I want the real Rin. All of her.", aff: 4, react: "She's yours. All of her. The mess and the magic.", expr: 'flustered' },
        { text: "Your heart is the best trick you've ever pulled.", aff: 4, react: "It wasn't a trick. It was the first honest thing I did.", expr: 'flustered' },
        { text: "Let's be each other's favorite person.", aff: 4, react: "Too late. You already are. Have been for days.", expr: 'happy' },
        { text: "No more notes. Just say it.", aff: 4, react: "...I love— I mean I REALLY LIKE— okay fine. You know.", expr: 'flustered' }
      ]
    };
    var pool = secrets[charKey];
    if (!pool) return null;
    return pool[dayIdx % pool.length];
  }

  var followupStep = 0; // tracks which follow-up we're on (0 = first, 1 = second)

  function handleChoice(charKey, dayIdx, choiceIdx) {
    if (typeof HSAudio !== 'undefined') HSAudio.click();
    var d = DIALOGUE[charKey][dayIdx];
    var choice = d.choices[choiceIdx];
    applyChoice(charKey, choice);
    // Show first follow-up after reaction
    followupStep = 0;
    showFollowupOrMatch(charKey, dayIdx);
  }

  function applyChoice(charKey, choice) {
    var mult = getAffectionMultiplier();
    addAffection(charKey, Math.round(choice.aff * mult));
    if (choice.aff > 0) {
      var rect = $('portraitCanvas').getBoundingClientRect();
      var containerRect = $('gameContainer').getBoundingClientRect();
      spawnHeart(rect.left - containerRect.left + rect.width / 2, rect.top - containerRect.top + 50, choice.aff);
    }
    renderPortrait($('portraitCanvas'), charKey, choice.expr || 'neutral');
    $('reactionBox').textContent = CHARS[charKey].name.split(' ')[0] + ': ' + choice.react;
    $('reactionBox').classList.add('visible');
    $('choicesPanel').innerHTML = '';
  }

  function showFollowupOrMatch(charKey, dayIdx) {
    var dayFollowups = FOLLOWUPS[charKey] && FOLLOWUPS[charKey][dayIdx];
    if (dayFollowups && followupStep < dayFollowups.length) {
      var fu = dayFollowups[followupStep];
      setTimeout(function() {
        // Update dialogue text with follow-up
        $('dialogueText').textContent = fu.text;
        $('reactionBox').classList.remove('visible');
        renderPortrait($('portraitCanvas'), charKey, 'neutral');
        // Render follow-up choices
        var panel = $('choicesPanel');
        panel.innerHTML = '';
        fu.choices.forEach(function(choice, i) {
          var btn = document.createElement('button');
          btn.className = 'choice-btn';
          btn.textContent = choice.text;
          btn.addEventListener('click', function() {
            if (typeof HSAudio !== 'undefined') HSAudio.click();
            applyChoice(charKey, choice);
            followupStep++;
            showFollowupOrMatch(charKey, dayIdx);
          });
          panel.appendChild(btn);
        });
      }, 1000);
    } else {
      // All follow-ups done — check for rainy day (no match)
      var dayEvent = DAY_EVENTS[state.day];
      setTimeout(function() {
        var btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        if (dayEvent && dayEvent.type === 'rainy') {
          btn.textContent = state.day >= TOTAL_DAYS ? 'See Ending' : 'Next Day \u2192';
          btn.addEventListener('click', function() { advanceDay(); });
        } else {
          btn.textContent = _t('hsTimePong');
          btn.addEventListener('click', function() { goToMatch(charKey); });
        }
        $('choicesPanel').appendChild(btn);
      }, 800);
    }
  }

  /* ════════════════════════════════════════════════════════════
     MATCH SCREEN (pre-match + pong)
     ════════════════════════════════════════════════════════════ */
  function goToMatch(charKey) {
    if (typeof HSAudio !== 'undefined') HSAudio.click();
    showScreen('match');
    var ch = CHARS[charKey];

    // Show ready overlay
    $('matchReady').style.display = '';
    $('matchPlaying').style.display = 'none';

    // VS display
    renderPortrait($('vsPortrait'), charKey, 'smirk');
    $('vsName').textContent = ch.name.split(' ')[0];
    $('vsName').style.color = ch.color;
    $('vsOppLabel').textContent = ch.name.split(' ')[0];
    $('vsPaddleAi').style.background = ch.color;

    // Match modifier banner (day 5+)
    var modBanner = $('modifierBanner');
    if (modBanner) {
      if (state.day >= 5) {
        var mod = MATCH_MODIFIERS[Math.floor(Math.random() * MATCH_MODIFIERS.length)];
        state.currentModifier = mod;
        modBanner.style.display = '';
        modBanner.textContent = mod.emoji + ' ' + mod.name;
        modBanner.style.background = 'rgba(255,255,255,0.9)';
      } else {
        state.currentModifier = null;
        modBanner.style.display = 'none';
      }
    }

    var startBtn = $('matchStartBtn');
    var newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStartBtn, startBtn);
    newStartBtn.addEventListener('click', function() {
      if (typeof HSAudio !== 'undefined') HSAudio.serve();
      $('matchReady').style.display = 'none';
      $('matchPlaying').style.display = '';
      startPong(charKey);
    });
  }

  /* ════════════════════════════════════════════════════════════
     PONG ENGINE
     ════════════════════════════════════════════════════════════ */
  var pongCanvas = $('pongCanvas');
  var pongCtx = pongCanvas ? pongCanvas.getContext('2d') : null;
  var PW = 580, PH = 380;
  var PADDLE_W = 12, PADDLE_H = 72;
  var BALL_R = 8;
  var pong = null;
  var pongRAF = null;
  var mouseY = PH / 2;

  // Mouse input
  if (pongCanvas) {
    pongCanvas.addEventListener('mousemove', function(e) {
      var rect = pongCanvas.getBoundingClientRect();
      var scaleY = PH / rect.height;
      mouseY = (e.clientY - rect.top) * scaleY;
    });
    pongCanvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var rect = pongCanvas.getBoundingClientRect();
      var scaleY = PH / rect.height;
      mouseY = (e.touches[0].clientY - rect.top) * scaleY;
    }, { passive: false });
  }

  // Keyboard input
  var keysDown = {};
  document.addEventListener('keydown', function(e) { keysDown[e.key] = true; });
  document.addEventListener('keyup', function(e) { keysDown[e.key] = false; });

  function startPong(charKey) {
    var ch = CHARS[charKey];
    // Determine match modifier (day 5+)
    var modifier = null;
    if (state.day >= 5) {
      var dayEvent = DAY_EVENTS[state.day];
      if (!dayEvent || dayEvent.type !== 'rainy') {
        modifier = MATCH_MODIFIERS[Math.floor(Math.random() * MATCH_MODIFIERS.length)];
      }
    }

    // Mood-based AI difficulty adjustment
    var moodAiSpeed = ch.aiSpeed;
    var mood = (state.mood && state.mood[charKey]) || 'neutral';
    if (mood === 'fired_up') moodAiSpeed += 0.05;
    else if (mood === 'vulnerable') moodAiSpeed -= 0.05;

    var basePaddleH = PADDLE_H;
    var baseBallR = BALL_R;
    var baseSpeed = 4.5;

    // Apply modifier
    if (modifier) {
      if (modifier.id === 'giant_paddles') basePaddleH = PADDLE_H * 1.6;
      if (modifier.id === 'tiny_ball') baseBallR = BALL_R * 0.6;
      if (modifier.id === 'speed_demon') baseSpeed = 6;
    }

    pong = {
      charKey: charKey,
      playerScore: 0,
      aiScore: 0,
      ball: { x: PW / 2, y: PH / 2, vx: 4, vy: 0, speed: baseSpeed },
      player: { x: 20, y: PH / 2 - basePaddleH / 2, w: PADDLE_W, h: basePaddleH, baseH: basePaddleH },
      ai: { x: PW - 20 - PADDLE_W, y: PH / 2 - basePaddleH / 2, w: PADDLE_W, h: basePaddleH, baseH: basePaddleH },
      aiSpeed: moodAiSpeed,
      aiReact: ch.aiReact,
      aiTarget: PH / 2,
      paused: false,
      pauseTimer: 0,
      rally: 0,
      maxRally: 0,
      particles: [],
      state: 'serve',
      modifier: modifier,
      ballRadius: baseBallR,
      // Power-up state
      powerUp: null,
      powerUpTimer: 480 + Math.floor(Math.random() * 420), // 8-15 sec at 60fps
      playerEffect: null,
      playerEffectTimer: 0,
      aiEffect: null,
      aiEffectTimer: 0,
      freezePlayer: 0,
      freezeAI: 0,
      heartShotActive: false,
      // Rally fever
      feverActive: false,
      feverTimer: 0,
      // Smash
      shakeTimer: 0,
      lightsOut: modifier && modifier.id === 'lights_out'
    };
    resetBall(1);
    $('pScoreDisplay').textContent = '0';
    $('aScoreDisplay').textContent = '0';

    // Update HUD text
    var controlsEl = document.querySelector('.pong-controls');
    if (controlsEl) controlsEl.textContent = 'Mouse or \u2191\u2193 to move \u00B7 First to ' + WIN_SCORE;

    mouseY = PH / 2;
    if (pongRAF) cancelAnimationFrame(pongRAF);
    pongLoop();
  }

  function resetBall(dir) {
    pong.ball.x = PW / 2;
    pong.ball.y = PH / 2;
    var angle = (Math.random() - 0.5) * 0.8;
    pong.ball.speed = 4.5;
    pong.ball.vx = Math.cos(angle) * pong.ball.speed * dir;
    pong.ball.vy = Math.sin(angle) * pong.ball.speed;
    pong.rally = 0;
    pong.state = 'serve';
    pong.pauseTimer = 40;
  }

  function pongLoop() {
    if (!pong) return;
    pongUpdate();
    pongDraw();
    pongRAF = requestAnimationFrame(pongLoop);
  }

  function pongUpdate() {
    if (!pong) return;

    // Pause between points
    if (pong.pauseTimer > 0) {
      pong.pauseTimer--;
      return;
    }
    pong.state = 'play';

    var b = pong.ball, p = pong.player, ai = pong.ai;
    var br = pong.ballRadius || BALL_R;

    // Decrement effect timers
    if (pong.playerEffectTimer > 0) {
      pong.playerEffectTimer--;
      if (pong.playerEffectTimer <= 0) {
        p.h = p.baseH; // reset big paddle
        pong.playerEffect = null;
      }
    }
    if (pong.aiEffectTimer > 0) {
      pong.aiEffectTimer--;
      if (pong.aiEffectTimer <= 0) {
        ai.h = ai.baseH;
        pong.aiEffect = null;
      }
    }
    if (pong.freezePlayer > 0) pong.freezePlayer--;
    if (pong.freezeAI > 0) pong.freezeAI--;
    if (pong.shakeTimer > 0) pong.shakeTimer--;
    if (pong.feverTimer > 0) pong.feverTimer--;
    else pong.feverActive = false;

    // Power-up spawning
    if (!pong.powerUp) {
      pong.powerUpTimer--;
      if (pong.powerUpTimer <= 0) {
        var puType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        pong.powerUp = {
          type: puType,
          x: PW * 0.3 + Math.random() * PW * 0.4,
          y: 30 + Math.random() * (PH - 60),
          timer: 360 // disappears after 6 seconds
        };
        pong.powerUpTimer = 480 + Math.floor(Math.random() * 420);
      }
    } else {
      pong.powerUp.timer--;
      if (pong.powerUp.timer <= 0) pong.powerUp = null;
    }

    // Power-up collection (paddle touches power-up zone)
    if (pong.powerUp) {
      var pu = pong.powerUp;
      var puR = 15;
      // Player collects
      if (p.x + p.w >= pu.x - puR && p.x <= pu.x + puR &&
          p.y <= pu.y + puR && p.y + p.h >= pu.y - puR) {
        applyPowerUp(pu.type, 'player');
        pong.powerUp = null;
      }
      // AI collects
      else if (ai.x <= pu.x + puR && ai.x + ai.w >= pu.x - puR &&
               ai.y <= pu.y + puR && ai.y + ai.h >= pu.y - puR) {
        applyPowerUp(pu.type, 'ai');
        pong.powerUp = null;
      }
    }

    // Player movement (unless frozen)
    if (pong.freezePlayer <= 0) {
      if (keysDown['ArrowUp'] || keysDown['w']) mouseY = p.y + p.h / 2 - 6;
      if (keysDown['ArrowDown'] || keysDown['s']) mouseY = p.y + p.h / 2 + 6;
      var targetY = mouseY - p.h / 2;
      p.y += (targetY - p.y) * 0.3;
    }
    p.y = Math.max(0, Math.min(PH - p.h, p.y));

    // AI movement — only track ball when it's heading toward AI side
    var aiTargetY = b.y - ai.h / 2;
    var ballComingToAI = b.vx > 0;
    var dayBonus = Math.min((state.day - 1) * 0.03, 0.15);

    if (pong.freezeAI <= 0) {
      if (CHARS[pong.charKey].pongStyle === 'tricky') {
        if (!pong.feintTimer) pong.feintTimer = 0;
        if (!pong.feintTarget) pong.feintTarget = null;
        pong.feintTimer--;
        if (pong.feintTimer <= 0) {
          if (Math.random() < 0.08) {
            pong.feintTarget = PH * Math.random();
            pong.feintTimer = 30 + Math.floor(Math.random() * 50);
          } else {
            pong.feintTarget = null;
            pong.feintTimer = 10 + Math.floor(Math.random() * 20);
          }
        }
        if (pong.feintTarget !== null) {
          pong.aiTarget = pong.feintTarget;
        } else if (ballComingToAI) {
          pong.aiTarget = aiTargetY + (Math.random() - 0.5) * 50;
        } else {
          pong.aiTarget = PH / 2 - ai.h / 2;
        }
      } else if (CHARS[pong.charKey].pongStyle === 'defensive') {
        if (ballComingToAI && b.x > PW * 0.4) {
          pong.aiTarget = aiTargetY * 0.6 + (PH / 2 - ai.h / 2) * 0.4;
        } else {
          pong.aiTarget = PH / 2 - ai.h / 2;
        }
      } else {
        if (ballComingToAI) {
          pong.aiTarget = aiTargetY;
        } else {
          pong.aiTarget = ai.y * 0.8 + (PH / 2 - ai.h / 2) * 0.2;
        }
      }

      var aiSpeedNow = (pong.aiSpeed + dayBonus) * 3.5;
      var aiDiff = pong.aiTarget - ai.y;
      var deadZone = pong.aiReact * PH;
      if (Math.abs(aiDiff) > deadZone) {
        ai.y += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff) * 0.08, aiSpeedNow);
      }
    }
    ai.y = Math.max(0, Math.min(PH - ai.h, ai.y));

    // Ball movement
    b.x += b.vx;
    b.y += b.vy;

    // Wall bounce
    if (b.y - br <= 0) { b.y = br; b.vy = Math.abs(b.vy); }
    if (b.y + br >= PH) { b.y = PH - br; b.vy = -Math.abs(b.vy); }

    // Paddle collision — player
    if (b.vx < 0 && b.x - br <= p.x + p.w && b.x + br >= p.x &&
        b.y >= p.y && b.y <= p.y + p.h) {
      b.x = p.x + p.w + br;
      var hitPos = (b.y - p.y) / p.h - 0.5;
      b.speed = Math.min(b.speed + 0.15, 8);
      b.vx = Math.cos(hitPos * 1.2) * b.speed;
      b.vy = Math.sin(hitPos * 1.2) * b.speed;
      if (b.vx < 1.5) b.vx = 1.5;
      // Smash: edge hit + high speed = speed burst + screen shake
      if (b.speed > 6 && (Math.abs(hitPos) > 0.35)) {
        b.speed = Math.min(b.speed * 1.3, 10);
        b.vx = Math.cos(hitPos * 1.2) * b.speed;
        b.vy = Math.sin(hitPos * 1.2) * b.speed;
        pong.shakeTimer = 12;
      }
      pong.rally++;
      if (pong.rally > pong.maxRally) pong.maxRally = pong.rally;
      // Rally fever check
      if (pong.rally >= 10 && !pong.feverActive) {
        pong.feverActive = true;
        pong.feverTimer = 180;
        if (typeof HSAudio !== 'undefined') HSAudio.fever();
      }
      pongSpawnHit(p.x + p.w, b.y);
      if (typeof HSAudio !== 'undefined') HSAudio.hit();
    }

    // Paddle collision — AI
    if (b.vx > 0 && b.x + br >= ai.x && b.x - br <= ai.x + ai.w &&
        b.y >= ai.y && b.y <= ai.y + ai.h) {
      b.x = ai.x - br;
      var hitPos2 = (b.y - ai.y) / ai.h - 0.5;
      b.speed = Math.min(b.speed + 0.1, 8);
      b.vx = -Math.cos(hitPos2 * 1.2) * b.speed;
      b.vy = Math.sin(hitPos2 * 1.2) * b.speed;
      if (b.vx > -1.5) b.vx = -1.5;
      pong.rally++;
      if (pong.rally > pong.maxRally) pong.maxRally = pong.rally;
      if (pong.rally >= 10 && !pong.feverActive) {
        pong.feverActive = true;
        pong.feverTimer = 180;
        if (typeof HSAudio !== 'undefined') HSAudio.fever();
      }
      pongSpawnHit(ai.x, b.y);
      if (typeof HSAudio !== 'undefined') HSAudio.hit();
    }

    // Score
    if (b.x < -br * 2) {
      pong.aiScore++;
      $('aScoreDisplay').textContent = pong.aiScore;
      if (typeof HSAudio !== 'undefined') HSAudio.losePoint();
      if (pong.aiScore >= WIN_SCORE) { endPong(); return; }
      resetBall(1);
    }
    if (b.x > PW + br * 2) {
      pong.playerScore++;
      $('pScoreDisplay').textContent = pong.playerScore;
      if (typeof HSAudio !== 'undefined') HSAudio.score();
      var cRect = pongCanvas.getBoundingClientRect();
      var gcRect = $('gameContainer').getBoundingClientRect();
      spawnHeart(cRect.left - gcRect.left + PW / 2, cRect.top - gcRect.top, 3);
      if (pong.playerScore >= WIN_SCORE) { endPong(); return; }
      resetBall(-1);
    }

    // Fever sparkles
    if (pong.feverActive && Math.random() < 0.3) {
      pong.particles.push({
        x: b.x + (Math.random() - 0.5) * 20,
        y: b.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        alpha: 1, size: 2 + Math.random() * 3,
        color: ['#ff6b9d', '#ffeb3b', '#b388ff'][Math.floor(Math.random() * 3)],
        isHeart: false
      });
    }

    // Update pong particles
    for (var i = pong.particles.length - 1; i >= 0; i--) {
      var pp = pong.particles[i];
      pp.x += pp.vx; pp.y += pp.vy;
      pp.alpha -= 0.04;
      if (pp.alpha <= 0) pong.particles.splice(i, 1);
    }
  }

  function applyPowerUp(puType, target) {
    if (typeof HSAudio !== 'undefined') HSAudio.powerUp();
    if (puType.id === 'big_paddle') {
      if (target === 'player') {
        pong.player.h = pong.player.baseH * 2;
        pong.playerEffect = 'big_paddle';
        pong.playerEffectTimer = puType.duration;
      } else {
        pong.ai.h = pong.ai.baseH * 2;
        pong.aiEffect = 'big_paddle';
        pong.aiEffectTimer = puType.duration;
      }
    } else if (puType.id === 'speed_ball') {
      pong.ball.speed *= 1.5;
      pong.ball.vx *= 1.5;
      pong.ball.vy *= 1.5;
    } else if (puType.id === 'freeze') {
      if (target === 'player') {
        pong.freezeAI = puType.duration;
      } else {
        pong.freezePlayer = puType.duration;
      }
    } else if (puType.id === 'heart_shot') {
      if (target === 'player') {
        pong.heartShotActive = true;
      }
    }
  }

  function pongSpawnHit(x, y) {
    var ch = CHARS[pong.charKey];
    var isPlayer = x < PW / 2;
    var baseColor = isPlayer ? '#82b1ff' : ch.color;
    for (var i = 0; i < 8; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 3;
      pong.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed * (isPlayer ? 1 : -1),
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 2 + Math.random() * 4,
        color: i < 3 ? baseColor : ['#ff6b9d', '#b388ff', '#ffeb3b', '#ff8a65'][Math.floor(Math.random() * 4)],
        isHeart: i < 2
      });
    }
  }

  function pongDraw() {
    if (!pongCtx || !pong) return;
    var ctx = pongCtx, b = pong.ball, p = pong.player, ai = pong.ai;
    var ch = CHARS[pong.charKey];
    var br = pong.ballRadius || BALL_R;

    // Screen shake offset
    var shakeX = 0, shakeY = 0;
    if (pong.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 6;
      shakeY = (Math.random() - 0.5) * 6;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Gradient background
    var bgGrd = ctx.createLinearGradient(0, 0, 0, PH);
    bgGrd.addColorStop(0, '#fef8ff');
    bgGrd.addColorStop(0.5, '#faf5ff');
    bgGrd.addColorStop(1, '#f5f0ff');
    ctx.fillStyle = bgGrd;
    ctx.fillRect(0, 0, PW, PH);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(200,180,220,0.06)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < PW; gx += 30) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, PH); ctx.stroke();
    }
    for (var gy = 0; gy < PH; gy += 30) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(PW, gy); ctx.stroke();
    }

    // Corner hearts
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ff6b9d';
    [[25, 25], [PW-25, 25], [25, PH-25], [PW-25, PH-25]].forEach(function(pos) {
      drawHeart(ctx, pos[0], pos[1] - 8, 16);
    });
    ctx.globalAlpha = 1;

    // Center line — dashed with gradient
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(180,160,220,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PW / 2, 0);
    ctx.lineTo(PW / 2, PH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center heart instead of circle
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#ff6b9d';
    drawHeart(ctx, PW / 2, PH / 2 - 20, 40);
    ctx.globalAlpha = 1;

    // Particles with hearts
    pong.particles.forEach(function(pp) {
      ctx.globalAlpha = pp.alpha;
      if (pp.isHeart) {
        ctx.fillStyle = pp.color;
        drawHeart(ctx, pp.x, pp.y - pp.size * 0.5, pp.size * 2);
      } else {
        ctx.fillStyle = pp.color;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, pp.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // Player paddle with glow
    ctx.shadowColor = 'rgba(90,130,255,0.35)';
    ctx.shadowBlur = 12;
    var pgrd = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
    pgrd.addColorStop(0, '#8cc5ff');
    pgrd.addColorStop(0.5, '#5c8aff');
    pgrd.addColorStop(1, '#4070e8');
    ctx.fillStyle = pgrd;
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);
    // Paddle shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(ctx, p.x + 2, p.y + 2, p.w * 0.4, p.h - 4, 3);
    ctx.shadowBlur = 0;

    // AI paddle with glow
    ctx.shadowColor = ch.color + '55';
    ctx.shadowBlur = 12;
    var agrd = ctx.createLinearGradient(ai.x, ai.y, ai.x + ai.w, ai.y + ai.h);
    agrd.addColorStop(0, shadeColor(ch.color, 30));
    agrd.addColorStop(0.5, ch.color);
    agrd.addColorStop(1, shadeColor(ch.color, -30));
    ctx.fillStyle = agrd;
    roundRect(ctx, ai.x, ai.y, ai.w, ai.h, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, ai.x + 2, ai.y + 2, ai.w * 0.4, ai.h - 4, 3);
    ctx.shadowBlur = 0;

    // Ball trail — 4 fading echoes
    for (var t = 4; t >= 1; t--) {
      ctx.globalAlpha = 0.06 * (5 - t);
      ctx.fillStyle = '#ff6b9d';
      ctx.beginPath();
      ctx.arc(b.x - b.vx * t * 1.5, b.y - b.vy * t * 1.5, br * (1 - t * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ball glow
    ctx.shadowColor = '#ff4081';
    ctx.shadowBlur = 15;

    // Ball — heart-shaped!
    ctx.fillStyle = '#ff4081';
    var bSize = br * 1.8;
    ctx.save();
    ctx.translate(b.x, b.y);
    // Rotate slightly based on velocity for dynamic feel
    ctx.rotate(Math.atan2(b.vy, b.vx) * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, bSize * 0.15);
    ctx.bezierCurveTo(0, -bSize * 0.1, -bSize * 0.5, -bSize * 0.1, -bSize * 0.5, bSize * 0.15);
    ctx.bezierCurveTo(-bSize * 0.5, bSize * 0.45, 0, bSize * 0.55, 0, bSize * 0.7);
    ctx.bezierCurveTo(0, bSize * 0.55, bSize * 0.5, bSize * 0.45, bSize * 0.5, bSize * 0.15);
    ctx.bezierCurveTo(bSize * 0.5, -bSize * 0.1, 0, -bSize * 0.1, 0, bSize * 0.15);
    ctx.closePath();
    // Heart gradient
    var hGrd = ctx.createRadialGradient(-bSize * 0.15, bSize * 0.1, 0, 0, bSize * 0.3, bSize * 0.6);
    hGrd.addColorStop(0, '#ff8faf');
    hGrd.addColorStop(1, '#ff1744');
    ctx.fillStyle = hGrd;
    ctx.fill();
    // Heart shine
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-bSize * 0.2, bSize * 0.08, bSize * 0.12, bSize * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    // Rally counter
    if (pong.rally > 2) {
      ctx.fillStyle = 'rgba(180,130,220,0.2)';
      ctx.font = '600 14px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(_t('hsRally') + ': ' + pong.rally, PW / 2, PH - 12);
    }

    // Power-up on court
    if (pong.powerUp && pong.powerUp.active) {
      var pu = pong.powerUp;
      var puType = null;
      for (var pi = 0; pi < POWERUP_TYPES.length; pi++) {
        if (POWERUP_TYPES[pi].id === pu.type) { puType = POWERUP_TYPES[pi]; break; }
      }
      if (puType) {
        ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
        ctx.fillStyle = puType.color;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(puType.emoji, pu.x, pu.y);
      }
    }

    // Active effect indicators
    if (pong.effects) {
      var ey = 18;
      ctx.font = '600 11px Nunito, sans-serif';
      ctx.textAlign = 'left';
      if (pong.effects.bigPaddlePlayer > 0) {
        ctx.fillStyle = '#42a5f5';
        ctx.fillText('\u{1F535} Big Paddle', 8, ey); ey += 14;
      }
      if (pong.effects.bigPaddleAI > 0) {
        ctx.fillStyle = '#ef5350';
        ctx.fillText('\u{1F534} AI Big Paddle', PW - 100, 18);
      }
      if (pong.effects.freezePlayer > 0) {
        ctx.fillStyle = '#00e5ff';
        ctx.fillText('\u2744\uFE0F Frozen!', 8, ey);
      }
      if (pong.effects.freezeAI > 0) {
        ctx.fillStyle = '#00e5ff';
        ctx.fillText('\u2744\uFE0F AI Frozen', PW - 90, 32);
      }
    }

    // Fever text
    if (pong.feverActive) {
      var feverPulse = 1 + Math.sin(Date.now() * 0.01) * 0.15;
      ctx.save();
      ctx.translate(PW / 2, 50);
      ctx.scale(feverPulse, feverPulse);
      ctx.font = '900 28px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4081';
      ctx.shadowColor = '#ff4081';
      ctx.shadowBlur = 20;
      ctx.fillText('\u{1F525} FEVER! \u{1F525}', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Lights-out overlay
    if (pong.lightsOut) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(-10, -10, PW + 20, PH + 20);
      // Spotlight around ball
      var spotGrd = ctx.createRadialGradient(b.x, b.y, 5, b.x, b.y, 80);
      spotGrd.addColorStop(0, 'rgba(0,0,0,0)');
      spotGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = spotGrd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Serve indicator
    if (pong.pauseTimer > 0) {
      ctx.fillStyle = 'rgba(120,80,180,0.2)';
      ctx.font = '600 22px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(_t('hsGetReady'), PW / 2, PH / 2 + 65);
      // Pulsing heart
      ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.008) * 0.1;
      ctx.fillStyle = '#ff6b9d';
      drawHeart(ctx, PW / 2, PH / 2 - 15, 25);
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // close screen shake save
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();
  }

  function endPong() {
    if (pongRAF) cancelAnimationFrame(pongRAF);
    pongRAF = null;
    var won = pong.playerScore >= WIN_SCORE;
    if (won && typeof HSAudio !== 'undefined') HSAudio.win();
    if (!won && typeof HSAudio !== 'undefined') HSAudio.lose();
    setTimeout(function() { showResults(pong.charKey, pong.playerScore, pong.aiScore); }, 600);
  }

  /* ════════════════════════════════════════════════════════════
     RESULTS SCREEN
     ════════════════════════════════════════════════════════════ */
  function showResults(charKey, pScore, aScore) {
    showScreen('results');
    var won = pScore >= WIN_SCORE;
    var diff = pScore - aScore;
    var ch = CHARS[charKey];

    // Rating (adjusted for first-to-3 matches)
    var rating, ratingEmoji, affBonus;
    if (won && diff >= 3) { rating = _t('hsPerfect'); ratingEmoji = '\u2728\u{1F496}\u2728'; affBonus = 6; }
    else if (won && diff >= 2) { rating = _t('hsNice'); ratingEmoji = '\u{1F31F}'; affBonus = 4; }
    else if (won) { rating = _t('hsClose'); ratingEmoji = '\u{1F4AA}'; affBonus = 3; }
    else if (diff >= -1) { rating = _t('hsAlmost'); ratingEmoji = '\u{1F60A}'; affBonus = 2; }
    else { rating = _t('hsOof'); ratingEmoji = '\u{1F605}'; affBonus = 1; }

    // Get reaction
    var reactKey;
    if (won && diff >= 3) reactKey = 'perfect';
    else if (won && diff >= 2) reactKey = 'nice';
    else if (won) reactKey = 'close';
    else if (diff >= -1) reactKey = 'loss';
    else reactKey = 'bad_loss';
    var reaction = MATCH_REACTIONS[charKey][reactKey];

    // Apply affection with festival multiplier and heart shot bonus
    var mult = getAffectionMultiplier();
    if (pong && pong.heartShotActive) { mult *= 2; pong.heartShotActive = false; }
    affBonus = Math.round(affBonus * mult);
    // Rally fever bonus
    if (pong && pong.maxRally >= 10) { affBonus += 2; }
    addAffection(charKey, affBonus);

    // Update mood based on result
    if (!state.mood) state.mood = {};
    state.mood[charKey] = won ? 'vulnerable' : 'fired_up'; // opponent mood
    saveState();

    // Render
    renderPortrait($('resultsPortrait'), charKey, won ? 'happy' : (diff >= -2 ? 'smirk' : 'happy'));
    $('resultsTitle').textContent = won ? _t('hsYouWin') : _t('hsYouLost');
    $('resultsTitle').style.color = won ? '#00c853' : '#ff6b35';
    $('resultsRating').textContent = ratingEmoji + ' ' + rating;
    $('resultsScoreline').textContent = pScore + ' \u2014 ' + aScore;
    $('resultsAffGain').textContent = '\u2665 +' + affBonus + ' ' + _t('hsAffWith') + ' ' + ch.name.split(' ')[0];
    $('resultsReaction').textContent = '"' + reaction + '"';

    // Spawn celebration
    if (won) {
      var gcRect = $('gameContainer').getBoundingClientRect();
      spawnHeart(gcRect.width / 2, gcRect.height / 3, 6);
      spawnSparkles(gcRect.width / 2, gcRect.height / 3, 8);
    }

    // Affection meters
    renderResultsMeters();

    // Button — show post-match walk inline, then advance
    // Clone button to remove any stale listeners from previous rounds
    var oldBtn = $('nextDayBtn');
    var btn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(btn, oldBtn);
    btn.id = 'nextDayBtn';
    btn.textContent = _t('hsWalkTogether');
    btn.addEventListener('click', function handler() {
      btn.removeEventListener('click', handler);
      showPostMatchInline(charKey, won);
    });
  }

  function showPostMatchInline(charKey, won) {
    var pool = POST_MATCH[charKey] && POST_MATCH[charKey][won ? 'win' : 'loss'];
    var pm = pool && pool.length > 0 ? pool[(state.day - 1) % pool.length] : null;
    var ch = CHARS[charKey];
    var card = document.querySelector('.results-card');
    if (!card || !pm) {
      advanceDay();
      return;
    }

    // Replace results card content with walk scene
    card.innerHTML = '';

    var scene = document.createElement('div');
    scene.style.cssText = 'font-size:13px;color:#78909c;font-style:italic;margin-bottom:12px;line-height:1.4;';
    scene.textContent = won
      ? _td('hsPMWinScene', 'The match is over. ') + ch.name.split(' ')[0] + _td('hsPMWinScene2', ' catches up to you outside.')
      : _td('hsPMLossScene', 'The match is over. ') + ch.name.split(' ')[0] + _td('hsPMLossScene2', ' walks alongside you.');
    card.appendChild(scene);

    var speaker = document.createElement('div');
    speaker.style.cssText = 'font-weight:700;font-size:14px;margin-bottom:4px;color:' + ch.color;
    speaker.textContent = ch.name.split(' ')[0];
    card.appendChild(speaker);

    var text = document.createElement('div');
    text.style.cssText = 'font-size:15px;line-height:1.5;margin-bottom:16px;color:#37474f;';
    text.textContent = pm.text;
    card.appendChild(text);

    var reactionEl = document.createElement('div');
    reactionEl.style.cssText = 'font-size:14px;font-style:italic;color:#78909c;margin-bottom:16px;display:none;';
    card.appendChild(reactionEl);

    var btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    card.appendChild(btnContainer);

    pm.choices.forEach(function(choice) {
      var choiceBtn = document.createElement('button');
      choiceBtn.className = 'choice-btn';
      choiceBtn.textContent = choice.text;
      choiceBtn.addEventListener('click', function() {
        if (typeof HSAudio !== 'undefined') HSAudio.click();
        addAffection(charKey, choice.aff);
        if (choice.aff > 0) {
          var gcRect = $('gameContainer').getBoundingClientRect();
          spawnHeart(gcRect.width / 2, gcRect.height / 3, choice.aff);
        }
        // Show reaction
        reactionEl.textContent = ch.name.split(' ')[0] + ': ' + choice.react;
        reactionEl.style.display = '';
        // Replace choices with advance button
        btnContainer.innerHTML = '';
        setTimeout(function() {
          var advBtn = document.createElement('button');
          advBtn.className = 'btn btn-primary';
          advBtn.textContent = state.day >= TOTAL_DAYS ? _t('hsSeeEnding') : _t('hsNextDay');
          advBtn.addEventListener('click', function() { advanceDay(); });
          btnContainer.appendChild(advBtn);
        }, 600);
      });
      btnContainer.appendChild(choiceBtn);
    });
  }

  function advanceDay() {
    // Apply jealousy drain before advancing
    applyJealousyDrain();

    if (state.day >= TOTAL_DAYS) {
      // Handle tournament: play remaining characters
      if (state.tournamentQueue && state.tournamentQueue.length > 0) {
        var nextChar = state.tournamentQueue.shift();
        saveState();
        startDialogue(nextChar);
        return;
      }
      triggerEnding();
    } else {
      state.day++;
      state.festivalActive = !!(DAY_EVENTS[state.day] && DAY_EVENTS[state.day].type === 'festival');

      // Tournament day: set up queue to play all 3 characters
      if (DAY_EVENTS[state.day] && DAY_EVENTS[state.day].type === 'tournament') {
        state.tournamentQueue = CHAR_KEYS.slice(); // will pick from select
      } else {
        state.tournamentQueue = null;
      }

      saveState();
      goToSelect();
    }
  }

  function renderResultsMeters() {
    var container = $('resultsMeters');
    container.innerHTML = '';
    CHAR_KEYS.forEach(function(k) {
      var ch = CHARS[k];
      var aff = state.affection[k] || 0;
      var pct = Math.min(100, Math.round(aff / MAX_AFFECTION * 100));
      var d = document.createElement('div');
      d.className = 'meter-mini';
      d.innerHTML = '<div class="meter-mini-name" style="color:' + ch.color + '">' + ch.name.split(' ')[0] + '</div>' +
        '<div class="meter-mini-bar"><div class="meter-mini-fill" style="width:' + pct + '%;background:' + ch.color + '"></div></div>' +
        '<div class="meter-mini-val">' + aff + '</div>';
      container.appendChild(d);
    });
  }

  /* ════════════════════════════════════════════════════════════
     ENDING
     ════════════════════════════════════════════════════════════ */
  function triggerEnding() {
    // Sort characters by affection
    var sorted = CHAR_KEYS.slice().sort(function(a, b) { return (state.affection[b] || 0) - (state.affection[a] || 0); });
    var bestKey = sorted[0], bestVal = state.affection[bestKey] || 0;
    var secondKey = sorted[1], secondVal = state.affection[secondKey] || 0;

    // Determine ending type
    var endingKey, portraitChar;

    // Lonely: no one above 15
    if (bestVal < 15) {
      endingKey = 'lonely'; portraitChar = null;
    }
    // Love triangle: 2 characters both above 50
    else if (bestVal >= 50 && secondVal >= 50) {
      endingKey = 'love_triangle'; portraitChar = bestKey;
    }
    // Confession: highest is 40+
    else if (bestVal >= 40) {
      endingKey = bestKey; portraitChar = bestKey;
    }
    // Best friend: 15-39
    else {
      endingKey = bestKey + '_friend'; portraitChar = bestKey;
    }

    var ending = ENDINGS[endingKey] || ENDINGS['none'];
    showScreen('ending');

    // Save to gallery
    var gallery = loadGallery();
    if (gallery.indexOf(endingKey) === -1) {
      gallery.push(endingKey);
      saveGallery(gallery);
    }

    if (portraitChar) {
      renderPortrait($('endingPortrait'), portraitChar, endingKey === 'love_triangle' ? 'surprised' : 'flustered');
      $('endingPortrait').style.display = '';
    } else {
      $('endingPortrait').style.display = 'none';
    }

    $('endingLabel').textContent = ending.label;
    $('endingSpeech').textContent = ending.speech;
    $('endingNarration').textContent = ending.narration;

    var total = totalAffection();
    $('endingScoreText').textContent = _t('hsTotalAffection') + ': ' + total;

    // Arcade integration
    if (typeof Arcade !== 'undefined') {
      Arcade.onGameOver('heart-serve', total);
      var best = parseInt(localStorage.getItem('heartServeBest') || '0');
      if (total > best) localStorage.setItem('heartServeBest', String(total));
    }

    // Spawn hearts for good endings
    if (endingKey !== 'lonely' && endingKey !== 'none') {
      var gcRect = $('gameContainer').getBoundingClientRect();
      for (var i = 0; i < 12; i++) {
        setTimeout(function() {
          spawnHeart(Math.random() * gcRect.width, Math.random() * gcRect.height * 0.5, 1);
        }, i * 200);
      }
    }
  }

  function loadGallery() {
    try { return JSON.parse(localStorage.getItem(GALLERY_KEY)) || []; } catch(e) { return []; }
  }
  function saveGallery(g) { localStorage.setItem(GALLERY_KEY, JSON.stringify(g)); }

  $('replayBtn').addEventListener('click', function() {
    localStorage.removeItem(SAVE_KEY);
    state = defaultState();
    saveState();
    showScreen('title');
    initTitle();
  });

  $('homeBtn').addEventListener('click', function() {
    window.location.href = '/';
  });

  // Arcade restart support
  document.addEventListener('arcade-restart', function() {
    localStorage.removeItem(SAVE_KEY);
    state = defaultState();
    location.reload();
  });

  /* ════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════ */
  function init() {
    initTitle();

    // If saved state exists mid-game, can continue
    if (state.day > 1 && state.day <= TOTAL_DAYS && state.screen !== 'title') {
      // Show title with continue option
      showScreen('title');
    } else {
      showScreen('title');
    }
  }


  /* ── i18n DOM init ── */
  if (typeof I18N !== 'undefined') {
    I18N.applyDOM();
    if (typeof I18N.createSelector === 'function') {
      I18N.createSelector(document.querySelector('#titleScreen .title-content'));
    }
  }

  init();
})();
