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
  var TOTAL_DAYS = 7;
  var WIN_SCORE = 3;
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

  /* ════════════════════════════════════════════════════════════
     FOLLOW-UP DIALOGUE — 2 extra conversation beats per day
     ════════════════════════════════════════════════════════════ */
  var FOLLOWUPS = {
    hana: [
      [{ text: "You know, most people flinch when I serve. You didn't.", choices: [
          { text: "I was too focused on you to flinch.", aff: 2, react: "On me?! I mean\u2014 on my FORM. Right.", expr: 'flustered' },
          { text: "I've got nerves of steel.", aff: 1, react: "We'll see about that.", expr: 'smirk' }]},
       { text: "Ready to put your money where your mouth is?", choices: [
          { text: "Always.", aff: 1, react: "Good answer.", expr: 'smirk' },
          { text: "Only if you promise a rematch.", aff: 2, react: "Ha! Already planning ahead. I respect that.", expr: 'happy' }]}],
      [{ text: "Your backhand is terrible, by the way. Want me to fix it?", choices: [
          { text: "Yes please, coach.", aff: 2, react: "*adjusts your grip* There. ...Your hand is warm.", expr: 'flustered' },
          { text: "My backhand is fine!", aff: 0, react: "It's really not. But okay.", expr: 'annoyed' }]},
       { text: "I don't usually offer to help people, you know.", choices: [
          { text: "I feel special.", aff: 2, react: "Don't let it go to your head.", expr: 'smirk' },
          { text: "Why me?", aff: 1, react: "...Good question. Next topic.", expr: 'flustered' }]}],
      [{ text: "I heard you've been asking about me. Cute.", choices: [
          { text: "Guilty. I wanted to know everything.", aff: 3, react: "*ears turn red* E-everything?!", expr: 'flustered' },
          { text: "Just doing research on my opponent.", aff: 1, react: "Smart. Know your enemy.", expr: 'smirk' }]},
       { text: "Ask me anything. One question. Go.", choices: [
          { text: "What makes you happy?", aff: 2, react: "...This. Right now. Don't make it weird.", expr: 'happy' },
          { text: "What's your win record?", aff: 0, react: "147-3. The three haunt me.", expr: 'neutral' }]}],
      [{ text: "I brought an extra water bottle. For you. Don't read into it.", choices: [
          { text: "Too late, I'm reading into it.", aff: 2, react: "UGH. You're impossible.", expr: 'flustered' },
          { text: "Thanks, Hana.", aff: 1, react: "...You're welcome. Whatever.", expr: 'happy' }]},
       { text: "My sister says I talk about you too much. She's wrong.", choices: [
          { text: "What do you say about me?", aff: 2, react: "NOTHING. She's LYING. Let's play.", expr: 'flustered' },
          { text: "Tell her I said hi.", aff: 1, react: "Absolutely not.", expr: 'annoyed' }]}],
      [{ text: "Remember when I said I only care about winning?", choices: [
          { text: "That was clearly a lie.", aff: 2, react: "...Yeah. It was.", expr: 'happy' },
          { text: "People change.", aff: 1, react: "Shut up. Let's play before I get sappy.", expr: 'flustered' }]},
       { text: "After this match, wanna grab food? I know a place.", choices: [
          { text: "Like a date?", aff: 3, react: "Like a\u2014 I said FOOD. It's just FOOD.", expr: 'flustered' },
          { text: "Sure, I'm starving.", aff: 1, react: "Cool. Casual. No big deal. Let's go.", expr: 'happy' }]}],
      [{ text: "I couldn't sleep last night. Kept thinking about... the tournament.", choices: [
          { text: "Just the tournament?", aff: 2, react: "...Mostly.", expr: 'flustered' },
          { text: "Nervous?", aff: 1, react: "Me? Never. ...Okay, maybe a little.", expr: 'neutral' }]},
       { text: "If I win the whole thing, I'm dedicating it to... someone.", choices: [
          { text: "To me?", aff: 2, react: "DON'T FLATTER YOURSELF. ...But also don't not.", expr: 'flustered' },
          { text: "Your family?", aff: 1, react: "Yeah. Them too.", expr: 'happy' }]}],
      [{ text: "Whatever happens today... I need you to know something.", choices: [
          { text: "I'm listening.", aff: 2, react: "You always are. That's what I need you to know.", expr: 'happy' },
          { text: "You're scaring me.", aff: 1, react: "Ha. The great Hana Takeda, scary. ...Sorry.", expr: 'smirk' }]},
       { text: "One more rally. Just you and me. No score.", choices: [
          { text: "For fun?", aff: 2, react: "For us.", expr: 'happy' },
          { text: "You're going soft, Takeda.", aff: 1, react: "Tell anyone and you're dead.", expr: 'smirk' }]}]
    ],
    yuki: [
      [{ text: "I-I made you a bookmark! It has a little ping pong ball on it...", choices: [
          { text: "This is the cutest thing I've ever received.", aff: 2, react: "R-really?! I was worried it was too much...", expr: 'flustered' },
          { text: "Thanks, Yuki!", aff: 1, react: "I'm glad you like it! I made five before getting one right...", expr: 'happy' }]},
       { text: "Um... do you have a favorite book? I want to know more about you.", choices: [
          { text: "I'd rather hear about yours.", aff: 2, react: "O-oh! I have a list! A very long list...", expr: 'happy' },
          { text: "I'm more of a movie person.", aff: 0, react: "Movies are good too! W-we could watch one sometime...", expr: 'surprised' }]}],
      [{ text: "I practiced my serve 200 times last night. I counted.", choices: [
          { text: "Your dedication is incredible.", aff: 2, react: "I just... wanted to be worth playing against...", expr: 'flustered' },
          { text: "200?! Don't hurt yourself.", aff: 1, react: "My arm is a little sore... but it's worth it.", expr: 'happy' }]},
       { text: "Can I tell you something weird? I dream about ping pong now.", choices: [
          { text: "Am I in the dreams?", aff: 2, react: "I\u2014 th-that's\u2014 MOVING ON.", expr: 'flustered' },
          { text: "That's not weird at all.", aff: 1, react: "Really? You don't think I'm strange?", expr: 'happy' }]}],
      [{ text: "The sunset is beautiful tonight. Like the inside of a seashell.", choices: [
          { text: "Not as beautiful as you.", aff: 3, react: "*drops books* I\u2014 you can't just SAY things like\u2014!", expr: 'flustered' },
          { text: "You should write poetry.", aff: 1, react: "I... actually do. In secret.", expr: 'surprised' }]},
       { text: "Nobody's ever spent this much time with me before. On purpose.", choices: [
          { text: "Their loss. Seriously.", aff: 2, react: "...Thank you. That means everything.", expr: 'happy' },
          { text: "You're easy to be around.", aff: 1, react: "That's... the nicest thing anyone's said.", expr: 'happy' }]}],
      [{ text: "I was reading about how stars form. It's a lot like friendship.", choices: [
          { text: "Tell me about it.", aff: 2, react: "Really? You want to hear? *lights up* So, gravity pulls dust together...", expr: 'happy' },
          { text: "You're such a nerd.", aff: -1, react: "O-oh... sorry, I know it's boring...", expr: 'sad' }]},
       { text: "I brought us tea. Chamomile. I-it's calming before a match.", choices: [
          { text: "You thought of everything.", aff: 2, react: "I like taking care of... people.", expr: 'flustered' },
          { text: "I could use some calm.", aff: 1, react: "Me too. *sips together in comfortable silence*", expr: 'happy' }]}],
      [{ text: "My mom asked about you. I didn't know what to say.", choices: [
          { text: "Tell her I'm your biggest fan.", aff: 2, react: "*covers face* She'd never stop teasing me!", expr: 'flustered' },
          { text: "What did she ask?", aff: 1, react: "If you're... nice. I said the nicest.", expr: 'happy' }]},
       { text: "I wrote a haiku about today. Want to hear?", choices: [
          { text: "Please. I'd love that.", aff: 2, react: "'Ping pong ball bounces / Your smile across the table / My heart returns serve'", expr: 'flustered' },
          { text: "Go for it!", aff: 1, react: "Okay... *takes deep breath* It's about... us. Sort of.", expr: 'happy' }]}],
      [{ text: "I've been braver lately. I even ordered food without stuttering.", choices: [
          { text: "I'm so proud of you, Yuki.", aff: 2, react: "*tears up a little* Y-you always believe in me...", expr: 'happy' },
          { text: "Growth looks good on you.", aff: 2, react: "...That's the kind of thing that makes me brave.", expr: 'flustered' }]},
       { text: "After today's match... can we sit on the roof again?", choices: [
          { text: "I'd follow you anywhere.", aff: 2, react: "P-please don't say things like that when I'm trying not to cry!", expr: 'flustered' },
          { text: "Our spot. I'll be there.", aff: 1, react: "*smiles quietly* Our spot. I like that.", expr: 'happy' }]}],
      [{ text: "I want to say something I've been practicing. Out loud. To you.", choices: [
          { text: "Take your time. I'm here.", aff: 2, react: "*deep breath* You make the world less scary. There. I said it.", expr: 'happy' },
          { text: "You can tell me anything.", aff: 1, react: "I know. That's why this is so hard. And so easy.", expr: 'flustered' }]},
       { text: "One last game. Then... whatever comes next.", choices: [
          { text: "Together.", aff: 2, react: "Together. *squeezes paddle* ...Let's play.", expr: 'happy' },
          { text: "You're going to do great.", aff: 1, react: "Because of you.", expr: 'happy' }]}]
    ],
    rin: [
      [{ text: "Fun fact: I once won a match playing left-handed. Blindfolded.", choices: [
          { text: "I don't believe you but I love you for it.", aff: 2, react: "Love?! On day one?! Bold move~!", expr: 'happy' },
          { text: "Pics or it didn't happen.", aff: 1, react: "The pics are classified. Top secret pong intel.", expr: 'smirk' }]},
       { text: "So what's YOUR deal? Why ping pong?", choices: [
          { text: "I came for the pong, stayed for you.", aff: 2, react: "Oh STOP. ...No wait, continue. I like this.", expr: 'happy' },
          { text: "I just like hitting things.", aff: 1, react: "A kindred spirit of violence! Beautiful~", expr: 'smirk' }]}],
      [{ text: "I have a theory: you can tell everything about a person by how they serve.", choices: [
          { text: "What does my serve say about me?", aff: 2, react: "That you're earnest. Genuine. ...It's annoying how charming that is.", expr: 'happy' },
          { text: "That's ridiculous.", aff: 0, react: "See? Skeptic serve. Exactly what I predicted.", expr: 'smirk' }]},
       { text: "Want to see something cool? I modified a paddle with LED lights.", choices: [
          { text: "You're an absolute menace and I'm here for it.", aff: 2, react: "FINALLY someone who appreciates art!", expr: 'happy' },
          { text: "Is that tournament legal?", aff: -1, react: "You sound like the ref. Boring~", expr: 'annoyed' }]}],
      [{ text: "I bet you think I'm always this chaotic. The truth is... I choose to be.", choices: [
          { text: "The real question is who you are when you choose not to be.", aff: 3, react: "...You're dangerously perceptive. I like it and I hate it.", expr: 'surprised' },
          { text: "Chaos is fun.", aff: 1, react: "It IS! See, you get it~", expr: 'happy' }]},
       { text: "When I was little, I was actually really quiet. Hard to believe, right?", choices: [
          { text: "I can see it, actually.", aff: 2, react: "...How? Nobody else can.", expr: 'surprised' },
          { text: "What changed?", aff: 1, react: "I got tired of being invisible. So I became... impossible to ignore.", expr: 'neutral' }]}],
      [{ text: "Okay real talk. Rate our chemistry. Scale of 1 to dynamite.", choices: [
          { text: "Nuclear.", aff: 2, react: "Nuclear?! That's past my scale! I need a bigger chart~!", expr: 'happy' },
          { text: "Solid 7.", aff: 1, react: "SEVEN? I'm offended but motivated. Watch me make it a 10.", expr: 'smirk' }]},
       { text: "My friends say I flirt with everyone. But with you it's... different.", choices: [
          { text: "Different how?", aff: 2, react: "Different like... I actually mean it. Wow, did I just say that out loud?", expr: 'flustered' },
          { text: "I noticed.", aff: 1, react: "Of course you did. You notice everything about me.", expr: 'happy' }]}],
      [{ text: "I learned a new trick shot. Named it after you.", choices: [
          { text: "What's it called?", aff: 2, react: "The Heartbreaker. Because it always lands. *winks*", expr: 'smirk' },
          { text: "I'm honored.", aff: 1, react: "You should be. I don't name shots after just anyone.", expr: 'happy' }]},
       { text: "Do you think people can change? Like, really change?", choices: [
          { text: "I think you already are.", aff: 3, react: "...Okay, that actually got me. Point to you.", expr: 'flustered' },
          { text: "Why do you ask?", aff: 1, react: "No reason. ...Every reason. Same thing.", expr: 'neutral' }]}],
      [{ text: "I didn't sleep. I was thinking about what you said yesterday.", choices: [
          { text: "Which part?", aff: 1, react: "All of it. Every word. I have a very specific problem and it's you.", expr: 'happy' },
          { text: "Good thoughts?", aff: 2, react: "The best kind. The scary kind. ...Same thing.", expr: 'flustered' }]},
       { text: "After this match, I want to show you my real laugh. Not the performance one.", choices: [
          { text: "I've been waiting for that.", aff: 2, react: "...How did you know there was a difference?", expr: 'surprised' },
          { text: "Deal.", aff: 1, react: "Deal. *genuine small smile*", expr: 'happy' }]}],
      [{ text: "No tricks today. No jokes. Just... us.", choices: [
          { text: "I like 'us.'", aff: 2, react: "Me too. And it terrifies me. In the best way.", expr: 'happy' },
          { text: "The real Rin. Finally.", aff: 2, react: "She's been here the whole time. You're just the first to look.", expr: 'flustered' }]},
       { text: "Whatever I wrote in that note... just know every word is true.", choices: [
          { text: "I already know.", aff: 2, react: "...Then let's play. One last time. For real.", expr: 'happy' },
          { text: "I can't wait to read it.", aff: 1, react: "Be gentle with it. It's the most honest thing I've ever done.", expr: 'flustered' }]}]
    ]
  };

  /* ════════════════════════════════════════════════════════════
     THIRD FOLLOW-UP — one more conversation beat before the match
     ════════════════════════════════════════════════════════════ */
  var FOLLOWUPS_3 = {
    hana: [
      { text: "You know what? You're the first person who doesn't bore me.", choices: [
        { text: "High praise from the champion.", aff: 2, react: "Don't get used to compliments.", expr: 'smirk' },
        { text: "You don't bore me either.", aff: 1, react: "Obviously. I'm fascinating.", expr: 'happy' }]},
      { text: "I watched your match against Sato. You've got potential.", choices: [
        { text: "You watched my match?!", aff: 2, react: "For RESEARCH. Don't be weird.", expr: 'flustered' },
        { text: "Any tips?", aff: 1, react: "Hit harder. Care less. ...One of those is bad advice.", expr: 'smirk' }]},
      { text: "My hands are shaking. I never shake. What are you doing to me?", choices: [
        { text: "Maybe you're excited.", aff: 2, react: "Excited? About YOU? ...Maybe.", expr: 'flustered' },
        { text: "Maybe you need to eat.", aff: 0, react: "Romance: zero. But you're probably right.", expr: 'annoyed' }]},
      { text: "I called you my rival to my team. They said that's not what rivals look like.", choices: [
        { text: "What do rivals look like?", aff: 2, react: "Not like... this. Apparently I smile too much around you.", expr: 'flustered' },
        { text: "We're more than rivals.", aff: 2, react: "Don't say that before a match. I need to focus.", expr: 'flustered' }]},
      { text: "I keep the scorecard from our first match. It's in my locker.", choices: [
        { text: "Sentimental for someone who 'only cares about winning.'", aff: 2, react: "I WILL destroy you. ...Right after being emotional.", expr: 'flustered' },
        { text: "I kept mine too.", aff: 2, react: "...We're both idiots, aren't we?", expr: 'happy' }]},
      { text: "I want to tell you something after the match. Promise you'll stay.", choices: [
        { text: "I'm not going anywhere.", aff: 2, react: "*deep breath* Okay. Good. Let's play.", expr: 'happy' },
        { text: "Wild horses couldn't drag me away.", aff: 1, react: "Dramatic. I like it. Now let's GO.", expr: 'smirk' }]},
      { text: "I'm going to play my absolute best. Because you deserve that.", choices: [
        { text: "So will I. For you.", aff: 2, react: "May the best heart win. ...I said heart. I meant player.", expr: 'flustered' },
        { text: "Bring it on, Takeda.", aff: 1, react: "There's the fire. I've been waiting for that.", expr: 'happy' }]}
    ],
    yuki: [
      { text: "I-I've been meaning to ask... what's your favorite color? For... research.", choices: [
        { text: "Whatever color your eyes are.", aff: 3, react: "*drops everything* Y-you can't just\u2014! My heart\u2014!", expr: 'flustered' },
        { text: "Blue. Like the sky.", aff: 1, react: "Blue is calming. I like blue too.", expr: 'happy' }]},
      { text: "I made flashcards for spin techniques. There are 47.", choices: [
        { text: "Show me all 47.", aff: 2, react: "Really?! Most people give up after three!", expr: 'happy' },
        { text: "You're the most dedicated person I know.", aff: 2, react: "O-only because you give me something to be dedicated for...", expr: 'flustered' }]},
      { text: "Someone was mean to me and I stood up for myself. First time ever.", choices: [
        { text: "Yuki, that's HUGE.", aff: 2, react: "I kept thinking 'what would they think?' ...Them being you.", expr: 'flustered' },
        { text: "What did you say?", aff: 1, react: "I said 'no thank you.' But I said it FIRMLY.", expr: 'happy' }]},
      { text: "I pressed flowers from the day we first met. Is that weird?", choices: [
        { text: "It's the most Yuki thing ever. I love it.", aff: 2, react: "You say my name like it's something precious...", expr: 'flustered' },
        { text: "Which flowers?", aff: 1, react: "Daisies. Growing by the ping pong table.", expr: 'happy' }]},
      { text: "My anxiety was bad today. But then I remembered we'd play together.", choices: [
        { text: "I'm glad I can be that for you.", aff: 2, react: "You're my favorite kind of calm.", expr: 'happy' },
        { text: "We don't have to play if you're not up for it.", aff: 1, react: "No\u2014 I WANT to. You make it better.", expr: 'happy' }]},
      { text: "I finished a whole poem about someone. Want the first line?", choices: [
        { text: "Every word.", aff: 2, react: "'In the space between serves, I found a home.' ...You're the home.", expr: 'flustered' },
        { text: "Save it for after the match.", aff: 1, react: "O-okay. Something to look forward to.", expr: 'happy' }]},
      { text: "No matter what happens today: you changed my life.", choices: [
        { text: "You changed mine too, Yuki.", aff: 2, react: "*tears falling but smiling* Let's play. Through the tears.", expr: 'happy' },
        { text: "We changed each other.", aff: 2, react: "That's the most beautiful thing I've ever heard.", expr: 'flustered' }]}
    ],
    rin: [
      { text: "Pop quiz! What's my favorite food? 3 seconds. Go.", choices: [
        { text: "Something chaotic. Pineapple pizza.", aff: 2, react: "CORRECT! Are you psychic or just perfect?!", expr: 'happy' },
        { text: "No idea.", aff: 0, react: "Unacceptable. You have homework now.", expr: 'smirk' }]},
      { text: "I ranked everyone here. You're number one.", choices: [
        { text: "Too late. It's gone to my heart.", aff: 2, react: "CORNY! ...But effective. Ugh.", expr: 'flustered' },
        { text: "What's the criteria?", aff: 1, react: "Vibes, chaos tolerance, smile quality. You aced all three.", expr: 'smirk' }]},
      { text: "My best friend says I sound 'dangerously smitten.'", choices: [
        { text: "Dangerously? So on-brand.", aff: 2, react: "Everything I do is dangerous, darling~", expr: 'smirk' },
        { text: "Are you? Smitten?", aff: 2, react: "...Next question.", expr: 'flustered' }]},
      { text: "I've been less funny lately. Want to know why?", choices: [
        { text: "Because you're being real instead.", aff: 3, react: "Stop seeing through me. It's rude. And amazing.", expr: 'flustered' },
        { text: "You're still pretty funny.", aff: 1, react: "Thanks. But funny isn't what I'm going for anymore.", expr: 'happy' }]},
      { text: "I carved our initials into the ping pong table. Janitor was NOT happy.", choices: [
        { text: "You're unhinged and I adore you.", aff: 2, react: "That's the nicest\u2014 I'm not crying, you're crying.", expr: 'flustered' },
        { text: "We're going to get in trouble.", aff: 0, react: "Worth it. Some things need to be permanent.", expr: 'happy' }]},
      { text: "Can I ask something real? No jokes, no deflecting.", choices: [
        { text: "Always.", aff: 2, react: "Do you see me? The real me? Not the show?", expr: 'surprised' },
        { text: "I'm listening.", aff: 1, react: "...You always are. That's the answer, isn't it?", expr: 'happy' }]},
      { text: "I'm scared. Not of losing. Of what happens when the games are over.", choices: [
        { text: "Then we'll find new games. Together.", aff: 2, react: "...Promise?", expr: 'happy' },
        { text: "Endings are just new beginnings.", aff: 1, react: "The old me would mock that. The new me believes it.", expr: 'flustered' }]}
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
      { text: "Better luck next time. ...You okay though?", choices: [
        { text: "Losing to you doesn't feel like losing.", aff: 2, react: "...Smoothest thing you've ever said.", expr: 'flustered' },
        { text: "I'll get you next time.", aff: 1, react: "THAT'S the spirit!", expr: 'happy' }]},
      { text: "Hey. Chin up. You played better than you think.", choices: [
        { text: "Are you... comforting me?", aff: 2, react: "NO. Stating facts. ...Are you okay?", expr: 'flustered' },
        { text: "Thanks, Hana.", aff: 1, react: "Don't mention it. Seriously. To anyone.", expr: 'happy' }]},
      { text: "I pushed you hard. You took it. That takes guts.", choices: [
        { text: "I'd take anything from you.", aff: 2, react: "W-what is THAT supposed to mean?!", expr: 'flustered' },
        { text: "You make me want to be better.", aff: 1, react: "...Good. That's really good.", expr: 'happy' }]}
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
      { text: "I-I'm sorry I beat you! Please don't be upset!", choices: [
        { text: "Yuki, you SHOULD be proud.", aff: 2, react: "...No one's ever told me to be proud before.", expr: 'happy' },
        { text: "I'm happy for you.", aff: 1, react: "That makes me happier than winning...", expr: 'flustered' }]},
      { text: "Want to study together? M-maybe that would help...", choices: [
        { text: "I'd love a study date.", aff: 2, react: "D-D-DATE?! I said STUDY! *face on fire*", expr: 'flustered' },
        { text: "That would be great.", aff: 1, react: "I'll bring snacks and color-coded notes!", expr: 'happy' }]},
      { text: "You let me win, didn't you? Please tell me you didn't.", choices: [
        { text: "You won fair and square.", aff: 2, react: "Then... I really AM getting better... *tears up*", expr: 'happy' },
        { text: "You were just better today.", aff: 1, react: "B-better? Me? I need to sit down...", expr: 'flustered' }]}
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
      { text: "Don't feel bad~ I cheat at everything. Except feelings.", choices: [
        { text: "You have feelings?", aff: 2, react: "Rude! But fair. Not hidden from you, though.", expr: 'flustered' },
        { text: "What feelings?", aff: 1, react: "Wouldn't YOU like to know~ ...Yes.", expr: 'smirk' }]},
      { text: "Consolation prize: you pick the music for our walk.", choices: [
        { text: "Something we can sing badly together.", aff: 2, react: "PERFECT answer. You really do get me.", expr: 'happy' },
        { text: "Your choice.", aff: 1, react: "Bold. You trust my taste? Dangerous.", expr: 'smirk' }]},
      { text: "Losing to me isn't really losing. It's... delayed winning.", choices: [
        { text: "Is that Rin philosophy?", aff: 2, react: "It's OUR philosophy now. Exclusively.", expr: 'happy' },
        { text: "That's actually comforting.", aff: 1, react: "Don't tell anyone I comfort people.", expr: 'smirk' }]}
    ]}
  };

  /* ════════════════════════════════════════════════════════════
     MORNING TEXTS — shown on character select cards
     ════════════════════════════════════════════════════════════ */
  var MORNING_TEXTS = {
    hana: [null, "Don't be late. I warmed up EXTRA.", "Dreamed I lost to you. Woke up furious.",
      "Bring your A-game. I'm in a mood.", "...Hey. Thanks for yesterday.",
      "Almost texted you last night. Almost.", "Last day. Don't make it easy."],
    yuki: [null, "G-good morning! Hope you slept well...", "Found a four-leaf clover for you!",
      "Been smiling all morning. Mom noticed.", "Wrote three poems last night. About... ping pong.",
      "Nervous about today. But the good kind.", "Whatever happens, thank you. For everything."],
    rin: [null, "rise and shine superstar~ round 2?", "wildest dream. you were in it. no details~",
      "fun fact: thinking about you for 14 hours", "real talk. I missed you. there I said it.",
      "learned a new trick. but I'd rather just talk.", "last day. no tricks. just us."]
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
    addAffection(charKey, choice.aff);
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
      // All follow-ups done, show match button
      setTimeout(function() {
        var btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = 'Time for ping pong!';
        btn.addEventListener('click', function() { goToMatch(charKey); });
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

    // AI movement — only track ball when it's heading toward AI side
    var aiTargetY = b.y - PADDLE_H / 2;
    var ballComingToAI = b.vx > 0;
    var dayBonus = Math.min((state.day - 1) * 0.03, 0.15); // slight scaling with day

    if (CHARS[pong.charKey].pongStyle === 'tricky') {
      // Rin: commits to feints for many frames, genuinely loses track
      if (!pong.feintTimer) pong.feintTimer = 0;
      if (!pong.feintTarget) pong.feintTarget = null;
      pong.feintTimer--;
      if (pong.feintTimer <= 0) {
        if (Math.random() < 0.08) {
          // Commit to a wild feint for 30-80 frames
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
        pong.aiTarget = PH / 2 - PADDLE_H / 2; // drift to center when ball away
      }
    } else if (CHARS[pong.charKey].pongStyle === 'defensive') {
      // Yuki: slow, drifts to center, only tracks when ball is close
      if (ballComingToAI && b.x > PW * 0.4) {
        pong.aiTarget = aiTargetY * 0.6 + (PH / 2 - PADDLE_H / 2) * 0.4;
      } else {
        pong.aiTarget = PH / 2 - PADDLE_H / 2; // hang out near center
      }
    } else {
      // Hana: tracks ball but only when coming toward her
      if (ballComingToAI) {
        pong.aiTarget = aiTargetY;
      } else {
        pong.aiTarget = ai.y * 0.8 + (PH / 2 - PADDLE_H / 2) * 0.2; // slow drift center
      }
    }

    var aiSpeedNow = (pong.aiSpeed + dayBonus) * 3.5;
    var aiDiff = pong.aiTarget - ai.y;
    var deadZone = pong.aiReact * PH;
    if (Math.abs(aiDiff) > deadZone) {
      ai.y += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff) * 0.08, aiSpeedNow);
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
      b.speed = Math.min(b.speed + 0.15, 7);
      b.vx = Math.cos(hitPos * 1.2) * b.speed;
      b.vy = Math.sin(hitPos * 1.2) * b.speed;
      if (b.vx < 1.5) b.vx = 1.5;
      pong.rally++;
      pongSpawnHit(p.x + p.w, b.y);
      if (typeof HSAudio !== 'undefined') HSAudio.hit();
    }

    // Paddle collision — AI
    if (b.vx > 0 && b.x + BALL_R >= ai.x && b.x - BALL_R <= ai.x + ai.w &&
        b.y >= ai.y && b.y <= ai.y + ai.h) {
      b.x = ai.x - BALL_R;
      var hitPos2 = (b.y - ai.y) / ai.h - 0.5;
      b.speed = Math.min(b.speed + 0.1, 7);
      b.vx = -Math.cos(hitPos2 * 1.2) * b.speed;
      b.vy = Math.sin(hitPos2 * 1.2) * b.speed;
      if (b.vx > -1.5) b.vx = -1.5;
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
      ctx.arc(b.x - b.vx * t * 1.5, b.y - b.vy * t * 1.5, BALL_R * (1 - t * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ball glow
    ctx.shadowColor = '#ff4081';
    ctx.shadowBlur = 15;

    // Ball — heart-shaped!
    ctx.fillStyle = '#ff4081';
    var bSize = BALL_R * 1.8;
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
      ctx.fillText('Rally: ' + pong.rally, PW / 2, PH - 12);
    }

    // Serve indicator
    if (pong.pauseTimer > 0) {
      ctx.fillStyle = 'rgba(120,80,180,0.2)';
      ctx.font = '600 22px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Get Ready...', PW / 2, PH / 2 + 65);
      // Pulsing heart
      ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.008) * 0.1;
      ctx.fillStyle = '#ff6b9d';
      drawHeart(ctx, PW / 2, PH / 2 - 15, 25);
      ctx.globalAlpha = 1;
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

    // Rating (adjusted for first-to-3 matches)
    var rating, ratingEmoji, affBonus;
    if (won && diff >= 3) { rating = 'Perfect!'; ratingEmoji = '\u2728\u{1F496}\u2728'; affBonus = 6; }
    else if (won && diff >= 2) { rating = 'Nice!'; ratingEmoji = '\u{1F31F}'; affBonus = 4; }
    else if (won) { rating = 'Close!'; ratingEmoji = '\u{1F4AA}'; affBonus = 3; }
    else if (diff >= -1) { rating = 'Almost!'; ratingEmoji = '\u{1F60A}'; affBonus = 2; }
    else { rating = 'Oof...'; ratingEmoji = '\u{1F605}'; affBonus = 1; }

    // Get reaction
    var reactKey;
    if (won && diff >= 3) reactKey = 'perfect';
    else if (won && diff >= 2) reactKey = 'nice';
    else if (won) reactKey = 'close';
    else if (diff >= -1) reactKey = 'loss';
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

    // Button — show post-match walk inline, then advance
    var btn = $('nextDayBtn');
    btn.textContent = 'Walk together...';
    btn.onclick = function() {
      btn.onclick = null; // prevent double-click
      showPostMatchInline(charKey, won);
    };
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
      ? 'The match is over. ' + ch.name.split(' ')[0] + ' catches up to you outside.'
      : 'The match is over. ' + ch.name.split(' ')[0] + ' walks alongside you.';
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
          advBtn.textContent = state.day >= TOTAL_DAYS ? 'See Ending' : 'Next Day \u2192';
          advBtn.addEventListener('click', function() { advanceDay(); });
          btnContainer.appendChild(advBtn);
        }, 600);
      });
      btnContainer.appendChild(choiceBtn);
    });
  }

  function advanceDay() {
    if (state.day >= TOTAL_DAYS) {
      triggerEnding();
    } else {
      state.day++;
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
