/* ═══════════════════════════════════════════════════════════════
   HeartServe: Love & Ping Pong — game.js
   Dating sim + ping pong arcade  ·  SlayPlay
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

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
      aiSpeed: 0.82,
      aiReact: 0.03,
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
      aiSpeed: 0.55,
      aiReact: 0.01,
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
      aiSpeed: 0.68,
      aiReact: 0.05,
      pongStyle: 'tricky'
    }
  };
  var CHAR_KEYS = ['hana', 'yuki', 'rin'];
  var TOTAL_DAYS = 7;
  var WIN_SCORE = 5;
  var MAX_AFFECTION = 100;

  /* ════════════════════════════════════════════════════════════
     DIALOGUE DATA  — 7 days × 3 characters × 3 choices
     ════════════════════════════════════════════════════════════ */
  var DIALOGUE = {
    hana: [
      { scene: 'Hana stretches by the ping pong table, eyes sharp.',
        text: "You're the new challenger? Good. I was getting bored beating everyone else.",
        choices: [
          { text: "Prepare to lose, champion.", aff: 3, react: "Oho? Bold. I like bold.", expr: 'smirk' },
          { text: "I'll give it my best shot!", aff: 1, react: "That's... fine, I guess. Just don't cry.", expr: 'neutral' },
          { text: "Go easy on me?", aff: -1, react: "*sighs* Where's the fun in that?", expr: 'annoyed' }
        ]},
      { scene: 'Hana is practicing serves. Her form is flawless.',
        text: "Back for more? Yesterday wasn't enough humiliation?",
        choices: [
          { text: "I've been practicing all night for you.", aff: 3, react: "*turns slightly red* F-for the GAME. You practiced for the game.", expr: 'flustered' },
          { text: "You're really good. Can you teach me?", aff: 2, react: "*blinks* Teach? I... sure. Get over here.", expr: 'surprised' },
          { text: "I just came to watch.", aff: -1, react: "Watching is for quitters. Pick up a paddle.", expr: 'annoyed' }
        ]},
      { scene: 'A tournament bracket is posted. You\'re in the same half as Hana.',
        text: "If we both keep winning, we'll face each other in the semis. Don't you dare lose before then.",
        choices: [
          { text: "I want to face you more than anything.", aff: 3, react: "*face turns red* S-stop saying weird stuff and just WIN!", expr: 'flustered' },
          { text: "I'll try to make it!", aff: 1, react: "Trying isn't winning. Remember that.", expr: 'neutral' },
          { text: "What if I lose on purpose?", aff: -1, react: "Then you're dead to me. Only half kidding.", expr: 'annoyed' }
        ]},
      { scene: 'You find Hana alone at the gym, hitting balls against the wall.',
        text: "Oh\u2014 Don't tell anyone you saw me practicing alone. It ruins the 'natural talent' image.",
        choices: [
          { text: "Your secret is safe with me.", aff: 3, react: "...Thanks. You're weirdly trustworthy, you know that?", expr: 'happy' },
          { text: "Why hide it? Hard work is cool.", aff: 2, react: "You think so? ...Nobody's ever said that to me.", expr: 'surprised' },
          { text: "Haha, so you DO have to practice!", aff: -1, react: "Get. Out. NOW.", expr: 'annoyed' }
        ]},
      { scene: 'Hana shows up with a brand-new paddle. She looks fired up.',
        text: "I got a new paddle just for you. ...That came out wrong. I mean to BEAT you.",
        choices: [
          { text: "Is that your way of saying I'm special?", aff: 3, react: "I\u2014 NO! It's\u2014 you're\u2014 ugh, just PLAY!", expr: 'flustered' },
          { text: "Cool paddle! Custom grip?", aff: 1, react: "...Yeah. Thanks for noticing.", expr: 'happy' },
          { text: "You didn't have to do that.", aff: 0, react: "I KNOW. I WANTED to. There's a difference.", expr: 'neutral' }
        ]},
      { scene: 'Hana is sitting outside, unusually quiet.',
        text: "Everyone thinks I only care about winning. But the truth is... I just don't know how else to connect with people.",
        choices: [
          { text: "You're connecting with me right now.", aff: 3, react: "...Yeah. I guess I am. *small smile*", expr: 'happy' },
          { text: "Winning IS pretty cool though.", aff: 1, react: "Hah. Way to lighten the mood, dork.", expr: 'smirk' },
          { text: "You should try being nicer.", aff: -1, react: "Wow. Groundbreaking advice. Thanks.", expr: 'annoyed' }
        ]},
      { scene: 'Final day. Hana is waiting, arms crossed but eyes soft.',
        text: "Last match of the season. Whatever happens... I'm glad it's you on the other side of the table.",
        choices: [
          { text: "Me too. Let's make it legendary.", aff: 3, react: "Legendary. I love that. Let's GO!", expr: 'happy' },
          { text: "Win or lose, I had fun.", aff: 2, react: "...Same. Don't tell anyone I said that.", expr: 'flustered' },
          { text: "I'm gonna crush you.", aff: 1, react: "HA! NOW you find your competitive side?!", expr: 'smirk' }
        ]}
    ],
    yuki: [
      { scene: 'Yuki is reading near the ping pong table. She startles.',
        text: "O-oh! Sorry, am I in the way? I like reading here because the rhythm of the ball is... soothing...",
        choices: [
          { text: "That's really poetic, actually.", aff: 3, react: "*blushes* Y-you think so? Nobody's ever said that...", expr: 'flustered' },
          { text: "Wanna play a round?", aff: 1, react: "M-me? I'm not very good, but... okay...", expr: 'surprised' },
          { text: "You're kind of in the way.", aff: -1, react: "I'm so sorry! I'll move\u2014 I'm always in the way...", expr: 'sad' }
        ]},
      { scene: 'Yuki has a stack of books about ping pong technique.',
        text: "I-I read three books about paddle grip last night... I wanted to be less terrible for you\u2014 I MEAN, for the game!",
        choices: [
          { text: "You studied for me? That's adorable.", aff: 3, react: "A-a-adorable?! I just... I wanted to improve!", expr: 'flustered' },
          { text: "That's real dedication!", aff: 2, react: "Th-thank you... knowledge is comfort for me.", expr: 'happy' },
          { text: "You could just practice instead of reading.", aff: -1, react: "O-oh... you're probably right... sorry...", expr: 'sad' }
        ]},
      { scene: 'Yuki manages a decent serve for the first time.',
        text: "Did you see that?! I\u2014 oh, sorry for shouting... but did you SEE that serve?!",
        choices: [
          { text: "That was AMAZING! Do it again!", aff: 3, react: "Y-you really think so?! Okay\u2014 watch closely!", expr: 'happy' },
          { text: "Nice serve!", aff: 1, react: "Thank you! The book said to follow through!", expr: 'happy' },
          { text: "It was okay.", aff: -1, react: "O-oh... okay is... better than terrible, I suppose...", expr: 'sad' }
        ]},
      { scene: 'It\'s raining. Yuki is by the window, looking dreamy.',
        text: "Do you ever wonder if raindrops are playing their own game? Bouncing off windows like tiny ping pong balls...",
        choices: [
          { text: "I love how you see the world.", aff: 3, react: "*turns bright red* I... no one's ever... thank you...", expr: 'flustered' },
          { text: "That's a fun way to think about it.", aff: 2, react: "It helps me not feel so nervous about everything.", expr: 'happy' },
          { text: "It's just rain.", aff: -1, react: "R-right... of course... I say weird things...", expr: 'sad' }
        ]},
      { scene: 'Yuki approaches you first for once.',
        text: "U-um! I signed up for the tournament! I know I'll probably lose but... you made me want to try.",
        choices: [
          { text: "I'm so proud of you!", aff: 3, react: "*tears up* Th-that means everything... truly...", expr: 'happy' },
          { text: "Good luck!", aff: 1, react: "Thank you! I'll need it...", expr: 'happy' },
          { text: "Are you sure? It might be embarrassing.", aff: -1, react: "I... maybe you're right... I'll withdraw...", expr: 'sad' }
        ]},
      { scene: 'After a long day, Yuki invites you to the rooftop.',
        text: "I come here when I'm anxious... The stars make my problems feel small. I've never brought anyone here before.",
        choices: [
          { text: "I'm honored you'd share this with me.", aff: 3, react: "You make me feel brave enough to share things...", expr: 'happy' },
          { text: "It's a nice view.", aff: 1, react: "It is... I'm glad you like it.", expr: 'happy' },
          { text: "I'm scared of heights, actually.", aff: 0, react: "Oh! W-we can go back down! I'm sorry!", expr: 'surprised' }
        ]},
      { scene: 'Yuki arrives with unusual confidence. Something is different.',
        text: "I won my first tournament match. I lost the second one, but... I won one. Because you believed in me.",
        choices: [
          { text: "You did that yourself. I just cheered.", aff: 3, react: "No... you did so much more than cheer. You saw me.", expr: 'happy' },
          { text: "Congrats, Yuki!", aff: 2, react: "Thank you! One more match together?", expr: 'happy' },
          { text: "See? Reading paid off.", aff: 1, react: "Heh... maybe a little of both.", expr: 'happy' }
        ]}
    ],
    rin: [
      { scene: 'Rin is doing trick shots, bouncing the ball off the ceiling.',
        text: "Ooh~ A new face! Rate my trick shot. Scale of 1 to 'marry me.'",
        choices: [
          { text: "Solid 'marry me.'", aff: 3, react: "Ahaha! Bold! I like you already~", expr: 'happy' },
          { text: "That was pretty impressive!", aff: 1, react: "Just impressive? I'm offended~", expr: 'smirk' },
          { text: "Shouldn't you hit it over the net?", aff: 0, react: "Rules are for people without style, darling~", expr: 'smirk' }
        ]},
      { scene: 'Rin has placed random obstacles on the ping pong table.',
        text: "Welcome to EXTREME ping pong! I added some... architectural improvements. Scared~?",
        choices: [
          { text: "I'm terrified and excited. Let's go.", aff: 3, react: "A kindred spirit of chaos! Perfection~!", expr: 'happy' },
          { text: "Is this even legal?", aff: 1, react: "Legal? Where's the fun in legal~?", expr: 'smirk' },
          { text: "Can we play normal ping pong?", aff: -1, react: "Booooring. You're no fun.", expr: 'annoyed' }
        ]},
      { scene: 'Rin pulls you aside with a mischievous grin.',
        text: "Let's make a bet~ If I win, you do whatever I say. If YOU win... I'll tell you a secret.",
        choices: [
          { text: "You're on. I want that secret.", aff: 3, react: "Motivated! I love when the stakes are high~", expr: 'happy' },
          { text: "What kind of secret?", aff: 2, react: "Wouldn't YOU like to know~ That's the whole point.", expr: 'smirk' },
          { text: "That sounds risky...", aff: -1, react: "Tch. Playing it safe is the biggest risk.", expr: 'annoyed' }
        ]},
      { scene: 'You catch Rin alone, without her usual grin. She looks tired.',
        text: "Oh\u2014 Hey! I was just\u2014 *puts on a smile* \u2014planning my next prank! What's up?",
        choices: [
          { text: "You don't have to perform for me.", aff: 3, react: "...How do you always see through me?", expr: 'surprised' },
          { text: "Are you okay?", aff: 2, react: "...I will be. Thanks for noticing.", expr: 'happy' },
          { text: "What prank?", aff: 0, react: "Haha, wouldn't you like to know~ *deflects*", expr: 'smirk' }
        ]},
      { scene: 'Rin finds you and sits unusually close.',
        text: "Everyone thinks I'm just the class clown. But sometimes I wonder if anyone would notice if the jokes stopped.",
        choices: [
          { text: "I'd notice. In a heartbeat.", aff: 3, react: "...You mean that, don't you? I can tell.", expr: 'happy' },
          { text: "Your jokes are great though!", aff: 1, react: "Thanks. But that's not what I meant.", expr: 'neutral' },
          { text: "People love you for more than jokes.", aff: 2, react: "Do they? Or do they love the character I play?", expr: 'surprised' }
        ]},
      { scene: 'Rin teaches you her signature spin serve.',
        text: "The trick is in the wrist~ Here, let me show you... *grabs your hand* Oops, too forward~?",
        choices: [
          { text: "Not forward enough.", aff: 3, react: "OH? Where was this energy on day one~?!", expr: 'flustered' },
          { text: "Y-your hand is warm.", aff: 2, react: "Aww, are you flustered? That's MY job~!", expr: 'smirk' },
          { text: "Just show me the technique.", aff: -1, react: "All business? Fine fine... *pout*", expr: 'annoyed' }
        ]},
      { scene: 'Last day. Rin is waiting with uncharacteristic seriousness.',
        text: "Last day, huh? I wrote you something. Don't read it until after our match. Promise?",
        choices: [
          { text: "I promise. This means a lot.", aff: 3, react: "...Good. Now let's play, before I get sappy.", expr: 'happy' },
          { text: "What is it?", aff: 1, react: "You'll see~ Some things are worth waiting for.", expr: 'smirk' },
          { text: "You? Writing something serious?", aff: -1, react: "I CAN be serious! ...Sometimes. Shut up.", expr: 'annoyed' }
        ]}
    ]
  };

  /* Post-match reactions per character */
  var MATCH_REACTIONS = {
    hana: {
      perfect: "Okay... OKAY! That was incredible. I'm not even mad. ...Much.",
      nice: "Not bad. You actually made me sweat a little.",
      close: "A close one! You're getting dangerous.",
      loss: "Ha! Better luck next time, rookie.",
      bad_loss: "...That was painful to watch. We need to train you."
    },
    yuki: {
      perfect: "W-wow! You're like a ping pong wizard! That was amazing!",
      nice: "You played so well! I learned a lot watching you!",
      close: "Th-that was so intense! My heart is still racing...",
      loss: "I-I won? Really? Oh my gosh... thank you for playing!",
      bad_loss: "I'm sorry... that must have been frustrating. Want to practice together?"
    },
    rin: {
      perfect: "Well well WELL~ Looks like I've been outplayed. How delicious~",
      nice: "Not bad, not bad~ You've earned my respect... and that's rare.",
      close: "Ooh, a nail-biter! My favorite kind of match~",
      loss: "Hehe~ Looks like the trickster wins today. Better luck next time~",
      bad_loss: "Oh honey... that was rough. Let me teach you my ways~"
    }
  };

  /* Ending confessions */
  var ENDINGS = {
    hana: {
      label: 'HANA\'S CONFESSION',
      speech: "\"I'm not good at this. I'm good at winning, not at... feelings. But you... you're the first person who made losing fun. And that terrifies me.\"\n\n*She looks away, ears red*\n\n\"So... same time tomorrow? ...Every tomorrow?\"",
      narration: "Hana catches you after the final match. Her grip on the paddle is white-knuckled, but her smile is the softest you've ever seen."
    },
    yuki: {
      label: 'YUKI\'S CONFESSION',
      speech: "\"I-I wrote something for you... It's every moment that made my heart race. Every serve, every smile, every time you made me brave...\"\n\n*She's shaking but smiling*\n\n\"The last page is blank. Because... I want us to write it together.\"",
      narration: "Yuki hands you a small wrapped book, her hands trembling. When you open it, every page is filled with memories of your time together."
    },
    rin: {
      label: 'RIN\'S CONFESSION',
      speech: "\"I stopped performing the day you started seeing me.\"\n\n*She's smiling but her eyes are glistening*\n\n\"No jokes. No tricks. You're my favorite person. And I don't say that to anyone.\n\n...Play one more game with me? Just for fun?\"",
      narration: "The note Rin gave you has just one line. When you look up, her usual mask is gone \u2014 and the real Rin is more beautiful than any trick she's ever pulled."
    },
    none: {
      label: 'SEASON\'S END',
      speech: "The season is over. You played some good matches and met some interesting people.",
      narration: "Maybe next time, you'll get to know someone a little better. The ping pong table will be waiting."
    }
  };

  /* ════════════════════════════════════════════════════════════
     STATE
     ════════════════════════════════════════════════════════════ */
  var SAVE_KEY = 'heartServeState';
  function defaultState() {
    return {
      day: 1,
      affection: { hana: 0, yuki: 0, rin: 0 },
      currentChar: null,
      screen: 'title',
      dayHistory: []
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
  function showScreen(name) {
    Object.keys(screens).forEach(function(k) {
      var s = screens[k];
      s.classList.remove('active', 'fade-in');
      if (k !== name) s.style.display = 'none';
    });
    var next = screens[name];
    next.style.display = 'flex';
    next.classList.add('fade-in');
    setTimeout(function() { next.classList.add('active'); next.classList.remove('fade-in'); }, 400);
    state.screen = name;
    saveState();
  }

  /* ════════════════════════════════════════════════════════════
     PORTRAIT RENDERER (Canvas chibi characters)
     ════════════════════════════════════════════════════════════ */
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

    // Background glow
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.8);
    grd.addColorStop(0, ch.colorLight);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Body/shoulders
    ctx.fillStyle = ch.color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.9, s * 0.55, s * 0.35, 0, 0, Math.PI);
    ctx.fill();

    // Neck
    ctx.fillStyle = ch.skinColor;
    ctx.fillRect(cx - s * 0.1, cy + s * 0.45, s * 0.2, s * 0.15);

    // Hair back (behind head)
    drawHairBack(ctx, charKey, ch, cx, cy, s);

    // Head
    ctx.fillStyle = ch.skinColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.44, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blush
    var blushAlpha = 0;
    if (expression === 'flustered') blushAlpha = 0.45;
    else if (expression === 'happy') blushAlpha = 0.2;
    if (blushAlpha > 0) {
      ctx.fillStyle = 'rgba(255,130,130,' + blushAlpha + ')';
      ctx.beginPath(); ctx.ellipse(cx - s * 0.26, cy + s * 0.12, s * 0.11, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + s * 0.26, cy + s * 0.12, s * 0.11, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Eyes
    drawEyes(ctx, ch, expression, cx, cy, s);

    // Mouth
    drawMouth(ctx, expression, cx, cy + s * 0.22, s);

    // Hair front
    drawHairFront(ctx, charKey, ch, cx, cy, s);
  }

  function drawEyes(ctx, ch, expr, cx, cy, s) {
    var eyeY = cy - s * 0.05;
    var eyeSpacing = s * 0.18;
    var eyeSize = s * 0.12;

    [-1, 1].forEach(function(side) {
      var ex = cx + side * eyeSpacing;
      if (expr === 'happy' || expr === 'flustered') {
        // Happy arc eyes ^_^
        ctx.strokeStyle = ch.eyeColor;
        ctx.lineWidth = s * 0.04;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeSize * 0.7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (expr === 'annoyed') {
        // Narrow eyes
        ctx.fillStyle = ch.eyeColor;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeSize, eyeSize * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Angry brow
        ctx.strokeStyle = ch.hairColor;
        ctx.lineWidth = s * 0.04;
        ctx.beginPath();
        ctx.moveTo(ex - eyeSize, eyeY - eyeSize * 1.3 + side * s * 0.04);
        ctx.lineTo(ex + eyeSize, eyeY - eyeSize * 1.3 - side * s * 0.04);
        ctx.stroke();
      } else if (expr === 'surprised') {
        // Big round eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ch.eyeColor;
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + eyeSize * 0.25, eyeY - eyeSize * 0.25, eyeSize * 0.18, 0, Math.PI * 2); ctx.fill();
      } else if (expr === 'sad') {
        // Droopy eyes
        ctx.fillStyle = ch.eyeColor;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY + s * 0.02, eyeSize * 0.8, eyeSize * 0.5, side * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(ex, eyeY + s * 0.02, eyeSize * 0.25, 0, Math.PI * 2); ctx.fill();
      } else {
        // Default / neutral / smirk
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ch.eyeColor;
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.65, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeSize * 0.3, 0, Math.PI * 2); ctx.fill();
        // Highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + eyeSize * 0.22, eyeY - eyeSize * 0.22, eyeSize * 0.18, 0, Math.PI * 2); ctx.fill();
        // Smirk: one eye narrower
        if (expr === 'smirk' && side === 1) {
          ctx.fillStyle = ch.skinColor;
          ctx.fillRect(ex - eyeSize * 1.2, eyeY - eyeSize * 0.3, eyeSize * 2.4, eyeSize * 0.4);
          ctx.strokeStyle = ch.eyeColor;
          ctx.lineWidth = s * 0.03;
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeSize * 0.6, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
      }
    });
  }

  function drawMouth(ctx, expr, mx, my, s) {
    ctx.strokeStyle = '#9e6b5a';
    ctx.lineWidth = s * 0.025;
    ctx.lineCap = 'round';
    if (expr === 'happy' || expr === 'smirk') {
      ctx.beginPath();
      ctx.arc(mx, my - s * 0.03, s * 0.1, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else if (expr === 'flustered') {
      // Wavy embarrassed mouth
      ctx.beginPath();
      ctx.moveTo(mx - s * 0.08, my);
      ctx.quadraticCurveTo(mx - s * 0.04, my + s * 0.04, mx, my);
      ctx.quadraticCurveTo(mx + s * 0.04, my - s * 0.04, mx + s * 0.08, my);
      ctx.stroke();
    } else if (expr === 'surprised') {
      ctx.fillStyle = '#9e6b5a';
      ctx.beginPath();
      ctx.ellipse(mx, my + s * 0.02, s * 0.05, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'annoyed') {
      ctx.beginPath();
      ctx.moveTo(mx - s * 0.08, my);
      ctx.lineTo(mx + s * 0.08, my);
      ctx.stroke();
    } else if (expr === 'sad') {
      ctx.beginPath();
      ctx.arc(mx, my + s * 0.06, s * 0.08, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    } else {
      // Neutral slight smile
      ctx.beginPath();
      ctx.arc(mx, my, s * 0.07, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }

  function drawHairBack(ctx, key, ch, cx, cy, s) {
    ctx.fillStyle = ch.hairColor;
    if (key === 'hana') {
      // Short spiky back
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.08, s * 0.5, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (key === 'yuki') {
      // Long flowing hair behind
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.48, cy - s * 0.2);
      ctx.quadraticCurveTo(cx - s * 0.55, cy + s * 0.6, cx - s * 0.35, cy + s * 1.0);
      ctx.lineTo(cx + s * 0.35, cy + s * 1.0);
      ctx.quadraticCurveTo(cx + s * 0.55, cy + s * 0.6, cx + s * 0.48, cy - s * 0.2);
      ctx.fill();
    } else if (key === 'rin') {
      // Twin tail base
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.05, s * 0.48, s * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      // Twin tails
      [-1, 1].forEach(function(side) {
        ctx.beginPath();
        ctx.moveTo(cx + side * s * 0.35, cy - s * 0.15);
        ctx.quadraticCurveTo(cx + side * s * 0.7, cy + s * 0.1, cx + side * s * 0.55, cy + s * 0.8);
        ctx.quadraticCurveTo(cx + side * s * 0.45, cy + s * 0.9, cx + side * s * 0.3, cy + s * 0.6);
        ctx.fill();
      });
    }
  }

  function drawHairFront(ctx, key, ch, cx, cy, s) {
    ctx.fillStyle = ch.hairColor;
    if (key === 'hana') {
      // Spiky bangs
      var bangs = [[-0.35, -0.4], [-0.2, -0.55], [-0.05, -0.48], [0.1, -0.58], [0.25, -0.42], [0.38, -0.38]];
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.45, cy - s * 0.15);
      bangs.forEach(function(p) { ctx.lineTo(cx + s * p[0], cy + s * p[1]); });
      ctx.lineTo(cx + s * 0.45, cy - s * 0.15);
      ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.35, cx + s * 0.35, cy - s * 0.52);
      ctx.quadraticCurveTo(cx, cy - s * 0.65, cx - s * 0.35, cy - s * 0.52);
      ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.35, cx - s * 0.45, cy - s * 0.15);
      ctx.fill();
      // Highlight
      ctx.fillStyle = ch.hairHighlight;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.1, cy - s * 0.45, s * 0.12, s * 0.06, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (key === 'yuki') {
      // Soft bangs with side-swept fringe
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.46, cy - s * 0.1);
      ctx.quadraticCurveTo(cx - s * 0.45, cy - s * 0.35, cx - s * 0.3, cy - s * 0.2);
      ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.35, cx - s * 0.08, cy - s * 0.22);
      ctx.quadraticCurveTo(cx + s * 0.05, cy - s * 0.38, cx + s * 0.15, cy - s * 0.2);
      ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.35, cx + s * 0.46, cy - s * 0.1);
      ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.4, cx + s * 0.35, cy - s * 0.55);
      ctx.quadraticCurveTo(cx, cy - s * 0.68, cx - s * 0.35, cy - s * 0.55);
      ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.4, cx - s * 0.46, cy - s * 0.1);
      ctx.fill();
      // Side hair strands
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.44, cy - s * 0.1);
      ctx.quadraticCurveTo(cx - s * 0.5, cy + s * 0.15, cx - s * 0.42, cy + s * 0.4);
      ctx.lineTo(cx - s * 0.35, cy + s * 0.35);
      ctx.quadraticCurveTo(cx - s * 0.4, cy + s * 0.1, cx - s * 0.38, cy - s * 0.05);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.44, cy - s * 0.1);
      ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.15, cx + s * 0.42, cy + s * 0.4);
      ctx.lineTo(cx + s * 0.35, cy + s * 0.35);
      ctx.quadraticCurveTo(cx + s * 0.4, cy + s * 0.1, cx + s * 0.38, cy - s * 0.05);
      ctx.fill();
      // Highlight
      ctx.fillStyle = ch.hairHighlight;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.08, cy - s * 0.42, s * 0.12, s * 0.05, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (key === 'rin') {
      // Messy bangs with middle part
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.44, cy - s * 0.08);
      ctx.lineTo(cx - s * 0.3, cy - s * 0.25);
      ctx.lineTo(cx - s * 0.15, cy - s * 0.18);
      ctx.lineTo(cx - s * 0.02, cy - s * 0.32);
      ctx.lineTo(cx + s * 0.02, cy - s * 0.32);
      ctx.lineTo(cx + s * 0.15, cy - s * 0.18);
      ctx.lineTo(cx + s * 0.3, cy - s * 0.25);
      ctx.lineTo(cx + s * 0.44, cy - s * 0.08);
      ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.35, cx + s * 0.32, cy - s * 0.55);
      ctx.quadraticCurveTo(cx, cy - s * 0.65, cx - s * 0.32, cy - s * 0.55);
      ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.35, cx - s * 0.44, cy - s * 0.08);
      ctx.fill();
      // Ribbon bows
      ctx.fillStyle = '#ffeb3b';
      [-1, 1].forEach(function(side) {
        ctx.beginPath();
        ctx.ellipse(cx + side * s * 0.38, cy - s * 0.25, s * 0.08, s * 0.05, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = ch.hairHighlight;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.12, cy - s * 0.4, s * 0.1, s * 0.04, -0.3, 0, Math.PI * 2);
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
        pCtx.fillStyle = p.color || '#ffeb3b';
        pCtx.beginPath();
        for (var j = 0; j < 5; j++) {
          var a = (j * 4 * Math.PI / 5) - Math.PI / 2;
          var r = j % 2 === 0 ? p.size : p.size * 0.4;
          pCtx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        pCtx.fill();
      } else {
        if (p.rotation !== undefined) pCtx.rotate(p.rotation);
        pCtx.fillStyle = '#ff1744';
        pCtx.font = p.size + 'px serif';
        pCtx.textAlign = 'center';
        pCtx.fillText('\u2665', 0, 0);
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
  }

  /* ════════════════════════════════════════════════════════════
     CHARACTER SELECT
     ════════════════════════════════════════════════════════════ */
  function goToSelect() {
    showScreen('select');
    $('dayBadge').textContent = 'Day ' + state.day;
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
      var hearts = document.createElement('div');
      hearts.className = 'char-card-hearts';
      renderHeartPips(hearts, k);
      card.appendChild(hearts);
      grid.appendChild(card);
      renderPortrait(canvas, k, 'happy', 0.85);
      card.addEventListener('click', function() { selectCharacter(k); });
    });
  }

  function selectCharacter(charKey) {
    if (typeof HSAudio !== 'undefined') HSAudio.click();
    state.currentChar = charKey;
    saveState();
    startDialogue(charKey);
  }

  /* ════════════════════════════════════════════════════════════
     DIALOGUE SYSTEM
     ════════════════════════════════════════════════════════════ */
  function startDialogue(charKey) {
    showScreen('dialogue');
    var ch = CHARS[charKey];
    var dayIdx = Math.min(state.day - 1, DIALOGUE[charKey].length - 1);
    var d = DIALOGUE[charKey][dayIdx];

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
  }

  function handleChoice(charKey, dayIdx, choiceIdx) {
    if (typeof HSAudio !== 'undefined') HSAudio.click();
    var d = DIALOGUE[charKey][dayIdx];
    var choice = d.choices[choiceIdx];

    // Add affection
    addAffection(charKey, choice.aff);

    // Spawn hearts if positive
    if (choice.aff > 0) {
      var rect = $('portraitCanvas').getBoundingClientRect();
      var containerRect = $('gameContainer').getBoundingClientRect();
      spawnHeart(rect.left - containerRect.left + rect.width / 2, rect.top - containerRect.top + 50, choice.aff);
    }

    // Update portrait expression
    renderPortrait($('portraitCanvas'), charKey, choice.expr || 'neutral');

    // Show reaction
    $('reactionBox').textContent = CHARS[charKey].name.split(' ')[0] + ': ' + choice.react;
    $('reactionBox').classList.add('visible');

    // Hide choices, show "continue to match" button
    $('choicesPanel').innerHTML = '';
    setTimeout(function() {
      var btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Time for ping pong!';
      btn.addEventListener('click', function() { goToMatch(charKey); });
      $('choicesPanel').appendChild(btn);
    }, 800);
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

    $('matchStartBtn').onclick = function() {
      if (typeof HSAudio !== 'undefined') HSAudio.serve();
      $('matchReady').style.display = 'none';
      $('matchPlaying').style.display = '';
      startPong(charKey);
    };
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
    pong = {
      charKey: charKey,
      playerScore: 0,
      aiScore: 0,
      ball: { x: PW / 2, y: PH / 2, vx: 4, vy: 0, speed: 4.5 },
      player: { x: 20, y: PH / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H },
      ai: { x: PW - 20 - PADDLE_W, y: PH / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H },
      aiSpeed: ch.aiSpeed,
      aiReact: ch.aiReact,
      aiTarget: PH / 2,
      paused: false,
      pauseTimer: 0,
      rally: 0,
      particles: [],
      state: 'serve' // serve, play, point
    };
    resetBall(1);
    $('pScoreDisplay').textContent = '0';
    $('aScoreDisplay').textContent = '0';
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

    // Player movement
    if (keysDown['ArrowUp'] || keysDown['w']) mouseY = p.y + PADDLE_H / 2 - 6;
    if (keysDown['ArrowDown'] || keysDown['s']) mouseY = p.y + PADDLE_H / 2 + 6;
    var targetY = mouseY - PADDLE_H / 2;
    p.y += (targetY - p.y) * 0.3;
    p.y = Math.max(0, Math.min(PH - PADDLE_H, p.y));

    // AI movement
    var aiTargetY = b.y - PADDLE_H / 2;
    // Add character-specific AI behavior
    if (CHARS[pong.charKey].pongStyle === 'tricky') {
      // Rin: unpredictable, sometimes feints
      if (Math.random() < 0.02) pong.aiTarget = PH * Math.random();
      else pong.aiTarget = aiTargetY + (Math.random() - 0.5) * 30;
    } else if (CHARS[pong.charKey].pongStyle === 'defensive') {
      // Yuki: stays near center, reacts to ball position
      pong.aiTarget = aiTargetY * 0.7 + (PH / 2 - PADDLE_H / 2) * 0.3;
    } else {
      // Hana: aggressive tracking
      pong.aiTarget = aiTargetY;
    }

    var aiDiff = pong.aiTarget - ai.y;
    var aiMaxSpeed = pong.aiSpeed * 5;
    if (Math.abs(aiDiff) > pong.aiReact * PH) {
      ai.y += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff) * pong.aiSpeed, aiMaxSpeed);
    }
    ai.y = Math.max(0, Math.min(PH - PADDLE_H, ai.y));

    // Ball movement
    b.x += b.vx;
    b.y += b.vy;

    // Wall bounce
    if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
    if (b.y + BALL_R >= PH) { b.y = PH - BALL_R; b.vy = -Math.abs(b.vy); }

    // Paddle collision — player
    if (b.vx < 0 && b.x - BALL_R <= p.x + p.w && b.x + BALL_R >= p.x &&
        b.y >= p.y && b.y <= p.y + p.h) {
      b.x = p.x + p.w + BALL_R;
      var hitPos = (b.y - p.y) / p.h - 0.5; // -0.5 to 0.5
      b.speed = Math.min(b.speed + 0.2, 9);
      b.vx = Math.cos(hitPos * 1.2) * b.speed;
      b.vy = Math.sin(hitPos * 1.2) * b.speed;
      if (b.vx < 1) b.vx = 1;
      pong.rally++;
      pongSpawnHit(p.x + p.w, b.y);
      if (typeof HSAudio !== 'undefined') HSAudio.hit();
    }

    // Paddle collision — AI
    if (b.vx > 0 && b.x + BALL_R >= ai.x && b.x - BALL_R <= ai.x + ai.w &&
        b.y >= ai.y && b.y <= ai.y + ai.h) {
      b.x = ai.x - BALL_R;
      var hitPos2 = (b.y - ai.y) / ai.h - 0.5;
      b.speed = Math.min(b.speed + 0.15, 9);
      b.vx = -Math.cos(hitPos2 * 1.2) * b.speed;
      b.vy = Math.sin(hitPos2 * 1.2) * b.speed;
      if (b.vx > -1) b.vx = -1;
      pong.rally++;
      pongSpawnHit(ai.x, b.y);
      if (typeof HSAudio !== 'undefined') HSAudio.hit();
    }

    // Score
    if (b.x < -BALL_R * 2) {
      pong.aiScore++;
      $('aScoreDisplay').textContent = pong.aiScore;
      if (typeof HSAudio !== 'undefined') HSAudio.losePoint();
      if (pong.aiScore >= WIN_SCORE) { endPong(); return; }
      resetBall(1);
    }
    if (b.x > PW + BALL_R * 2) {
      pong.playerScore++;
      $('pScoreDisplay').textContent = pong.playerScore;
      if (typeof HSAudio !== 'undefined') HSAudio.score();
      // Spawn celebration hearts
      var cRect = pongCanvas.getBoundingClientRect();
      var gcRect = $('gameContainer').getBoundingClientRect();
      spawnHeart(cRect.left - gcRect.left + PW / 2, cRect.top - gcRect.top, 3);
      if (pong.playerScore >= WIN_SCORE) { endPong(); return; }
      resetBall(-1);
    }

    // Update pong particles
    for (var i = pong.particles.length - 1; i >= 0; i--) {
      var pp = pong.particles[i];
      pp.x += pp.vx; pp.y += pp.vy;
      pp.alpha -= 0.04;
      if (pp.alpha <= 0) pong.particles.splice(i, 1);
    }
  }

  function pongSpawnHit(x, y) {
    for (var i = 0; i < 5; i++) {
      pong.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        alpha: 1,
        size: 3 + Math.random() * 3,
        color: ['#ff6b9d', '#b388ff', '#ffeb3b'][Math.floor(Math.random() * 3)]
      });
    }
  }

  function pongDraw() {
    if (!pongCtx || !pong) return;
    var ctx = pongCtx, b = pong.ball, p = pong.player, ai = pong.ai;

    // Background
    ctx.fillStyle = '#faf8ff';
    ctx.fillRect(0, 0, PW, PH);

    // Center line
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PW / 2, 0);
    ctx.lineTo(PW / 2, PH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.beginPath();
    ctx.arc(PW / 2, PH / 2, 40, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Particles
    pong.particles.forEach(function(pp) {
      ctx.globalAlpha = pp.alpha;
      ctx.fillStyle = pp.color;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, pp.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Player paddle
    var pgrd = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    pgrd.addColorStop(0, '#82b1ff');
    pgrd.addColorStop(1, '#5c8aff');
    ctx.fillStyle = pgrd;
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);

    // AI paddle
    var ch = CHARS[pong.charKey];
    ctx.fillStyle = ch.color;
    roundRect(ctx, ai.x, ai.y, ai.w, ai.h, 6);

    // Ball trail
    ctx.fillStyle = 'rgba(255,107,157,0.15)';
    ctx.beginPath();
    ctx.arc(b.x - b.vx * 2, b.y - b.vy * 2, BALL_R * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,107,157,0.08)';
    ctx.beginPath();
    ctx.arc(b.x - b.vx * 4, b.y - b.vy * 4, BALL_R * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    var bgrd = ctx.createRadialGradient(b.x - 2, b.y - 2, 0, b.x, b.y, BALL_R);
    bgrd.addColorStop(0, '#ff8faf');
    bgrd.addColorStop(1, '#ff4081');
    ctx.fillStyle = bgrd;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(b.x - 2, b.y - 2, BALL_R * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Serve indicator
    if (pong.pauseTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.font = '600 20px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Get Ready...', PW / 2, PH / 2 + 60);
    }
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

    // Rating
    var rating, ratingEmoji, affBonus;
    if (won && diff >= 4) { rating = 'Perfect!'; ratingEmoji = '\u2728\u{1F496}\u2728'; affBonus = 8; }
    else if (won && diff >= 2) { rating = 'Nice!'; ratingEmoji = '\u{1F31F}'; affBonus = 5; }
    else if (won) { rating = 'Close!'; ratingEmoji = '\u{1F4AA}'; affBonus = 3; }
    else if (diff >= -2) { rating = 'Almost!'; ratingEmoji = '\u{1F60A}'; affBonus = 2; }
    else { rating = 'Oof...'; ratingEmoji = '\u{1F605}'; affBonus = 1; }

    // Get reaction
    var reactKey;
    if (won && diff >= 4) reactKey = 'perfect';
    else if (won && diff >= 2) reactKey = 'nice';
    else if (won) reactKey = 'close';
    else if (diff >= -2) reactKey = 'loss';
    else reactKey = 'bad_loss';
    var reaction = MATCH_REACTIONS[charKey][reactKey];

    // Apply affection
    addAffection(charKey, affBonus);

    // Render
    renderPortrait($('resultsPortrait'), charKey, won ? 'happy' : (diff >= -2 ? 'smirk' : 'happy'));
    $('resultsTitle').textContent = won ? 'You Win!' : 'You Lost!';
    $('resultsTitle').style.color = won ? '#00c853' : '#ff6b35';
    $('resultsRating').textContent = ratingEmoji + ' ' + rating;
    $('resultsScoreline').textContent = pScore + ' \u2014 ' + aScore;
    $('resultsAffGain').textContent = '\u2665 +' + affBonus + ' affection with ' + ch.name.split(' ')[0];
    $('resultsReaction').textContent = '"' + reaction + '"';

    // Spawn celebration
    if (won) {
      var gcRect = $('gameContainer').getBoundingClientRect();
      spawnHeart(gcRect.width / 2, gcRect.height / 3, 6);
      spawnSparkles(gcRect.width / 2, gcRect.height / 3, 8);
    }

    // Affection meters
    renderResultsMeters();

    // Button
    var btn = $('nextDayBtn');
    if (state.day >= TOTAL_DAYS) {
      btn.textContent = 'See Ending';
      btn.onclick = function() { triggerEnding(); };
    } else {
      btn.textContent = 'Next Day \u2192';
      btn.onclick = function() {
        state.day++;
        saveState();
        goToSelect();
      };
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
    // Find highest affection character
    var bestKey = null, bestVal = 0;
    CHAR_KEYS.forEach(function(k) {
      if ((state.affection[k] || 0) > bestVal) {
        bestVal = state.affection[k];
        bestKey = k;
      }
    });

    // Need at least 15 affection for a real ending
    if (!bestKey || bestVal < 15) bestKey = 'none';

    var ending = ENDINGS[bestKey];
    showScreen('ending');

    if (bestKey !== 'none') {
      renderPortrait($('endingPortrait'), bestKey, 'flustered');
      $('endingPortrait').style.display = '';
    } else {
      $('endingPortrait').style.display = 'none';
    }

    $('endingLabel').textContent = ending.label;
    $('endingSpeech').textContent = ending.speech;
    $('endingNarration').textContent = ending.narration;

    var total = totalAffection();
    $('endingScoreText').textContent = 'Total affection: ' + total;

    // Arcade integration
    if (typeof Arcade !== 'undefined') {
      Arcade.onGameOver('heart-serve', total);
      var best = parseInt(localStorage.getItem('heartServeBest') || '0');
      if (total > best) localStorage.setItem('heartServeBest', String(total));
    }

    // Spawn hearts for good endings
    if (bestKey !== 'none') {
      var gcRect = $('gameContainer').getBoundingClientRect();
      for (var i = 0; i < 12; i++) {
        setTimeout(function() {
          spawnHeart(Math.random() * gcRect.width, Math.random() * gcRect.height * 0.5, 1);
        }, i * 200);
      }
    }
  }

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

  init();
})();
