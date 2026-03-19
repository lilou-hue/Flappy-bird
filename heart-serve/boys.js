/* ═══════════════════════════════════════════════════════════════
   HeartServe: Love & Ping Pong — boys.js
   Male character data for "Boy Version"  ·  SlayPlay
   ═══════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   CHARACTER DATA — BOYS
   ════════════════════════════════════════════════════════════ */
var CHARS_BOYS = {
  kaito: {
    name: 'Kaito Tanaka',
    title: 'The Fierce Competitor',
    color: '#e84820',
    colorLight: '#ffe0d0',
    skinColor: '#f5d4b8',
    hairColor: '#1a1a2e',
    hairHighlight: '#2a2a4e',
    eyeColor: '#d4380d',
    desc: 'Bold, competitive, secretly sweet',
    aiSpeed: 0.38,
    aiReact: 0.06,
    pongStyle: 'aggressive'
  },
  sora: {
    name: 'Sora Mizuki',
    title: 'The Gentle Soul',
    color: '#5c6bc0',
    colorLight: '#e0e4ff',
    skinColor: '#fce8e0',
    hairColor: '#78909c',
    hairHighlight: '#b0bec5',
    eyeColor: '#5c6bc0',
    desc: 'Kind, shy, quietly determined',
    aiSpeed: 0.25,
    aiReact: 0.04,
    pongStyle: 'defensive'
  },
  haruki: {
    name: 'Haruki Endo',
    title: 'The Chaotic Charmer',
    color: '#ff8f00',
    colorLight: '#fff3d0',
    skinColor: '#fde8d0',
    hairColor: '#5d4037',
    hairHighlight: '#8d6e63',
    eyeColor: '#ff8f00',
    desc: 'Playful, witty, surprisingly deep',
    aiSpeed: 0.32,
    aiReact: 0.08,
    pongStyle: 'tricky'
  }
};
var CHAR_KEYS_BOYS = ['kaito', 'sora', 'haruki'];

/* ════════════════════════════════════════════════════════════
   DIALOGUE DATA — BOYS — 14 days × 3 characters × 3 choices
   ════════════════════════════════════════════════════════════ */
var DIALOGUE_BOYS = {
  kaito: [
    { scene: 'Kaito is stretching by the ping pong table, sleeves rolled up, eyes sharp.',
      text: "Tch. Another challenger? Fine. Don't waste my time.",
      choices: [
        { text: "I plan to make you remember my name.", aff: 3, react: "*narrows eyes* ...Heh. Bold. I don't hate it.", expr: 'smirk' },
        { text: "I'll do my best!", aff: 1, react: "Your best? That remains to be seen.", expr: 'neutral' },
        { text: "Go easy on me?", aff: -1, react: "Tch. I don't do easy. Pick up the paddle or leave.", expr: 'annoyed' }
      ]},
    { scene: 'Kaito is slamming practice serves. Each one hits the same corner perfectly.',
      text: "Back again? Figured you'd quit after yesterday.",
      choices: [
        { text: "I stayed up all night thinking about our match.", aff: 3, react: "*grip tightens on paddle* About the MATCH. Right. Obviously.", expr: 'flustered' },
        { text: "Your serves are incredible. Can you teach me?", aff: 2, react: "*blinks* You want ME to... yeah. Whatever. Get over here.", expr: 'surprised' },
        { text: "I just came to watch today.", aff: -1, react: "Watching is for people who've given up. Play or leave.", expr: 'annoyed' }
      ]},
    { scene: 'The tournament bracket is posted. You and Kaito are in the same half.',
      text: "We'll meet in the semis if you don't choke. So don't choke.",
      choices: [
        { text: "I wouldn't miss a match with you for anything.", aff: 3, react: "*ears turn red* It's a TOURNAMENT. Stop making it weird!", expr: 'flustered' },
        { text: "I'll fight my way to you!", aff: 1, react: "Good. Anything less would be insulting.", expr: 'neutral' },
        { text: "What if I throw my matches?", aff: -1, react: "Then we're done. I only respect people who fight.", expr: 'annoyed' }
      ]},
    { scene: 'You find Kaito alone in the gym after hours, drilling serves into the wall.',
      text: "How long have you been standing there? ...Don't tell anyone I practice this much. They think it's all natural talent.",
      choices: [
        { text: "Your secret is safe with me.", aff: 3, react: "...You're annoyingly trustworthy. You know that?", expr: 'happy' },
        { text: "Hard work is nothing to hide.", aff: 2, react: "*pauses* Nobody's ever... whatever. Thanks.", expr: 'surprised' },
        { text: "Ha! So the genius has to practice after all!", aff: -1, react: "Get. Out. Now.", expr: 'annoyed' }
      ]},
    { scene: 'Kaito shows up with a brand-new paddle, trying to look casual about it.',
      text: "Got a new paddle. Custom weighted. ...For beating you specifically. Don't read into it.",
      choices: [
        { text: "You bought a paddle just for me? I'm flattered.", aff: 3, react: "For BEATING you! There's a difference! ...Tch.", expr: 'flustered' },
        { text: "Nice grip tape. Custom job?", aff: 1, react: "...Yeah. Good eye. *almost smiles*", expr: 'happy' },
        { text: "That's a lot of effort.", aff: 0, react: "I KNOW it's a lot of effort. I WANTED to. Shut up.", expr: 'neutral' }
      ]},
    { scene: 'Kaito is sitting on the bench outside, unusually quiet. His paddle rests beside him.',
      text: "Everyone thinks I'm just some angry guy who only cares about winning. But winning was the only way anyone ever noticed me.",
      choices: [
        { text: "I notice you. Win or lose.", aff: 3, react: "...Tch. *voice cracks* Why do you have to say stuff like that?", expr: 'happy' },
        { text: "Winning IS pretty cool though.", aff: 1, react: "Heh. Leave it to you to make me smirk right now.", expr: 'smirk' },
        { text: "Maybe try being friendlier.", aff: -1, react: "Wow. Revolutionary advice. Thanks, genius.", expr: 'annoyed' }
      ]},
    { scene: 'Final day. Kaito is waiting at the table, arms crossed, but his expression is softer than you have ever seen.',
      text: "Last match. Whatever happens today... I'm glad you didn't quit after day one.",
      choices: [
        { text: "Me too. Let's make this one legendary.", aff: 3, react: "Legendary. *genuine smile* Yeah. Let's do this.", expr: 'happy' },
        { text: "Win or lose, this was worth it.", aff: 2, react: "...Same. Don't tell anyone I said that.", expr: 'flustered' },
        { text: "I'm going to destroy you.", aff: 1, react: "HA! NOW you find your fire? About time!", expr: 'smirk' }
      ]},
    { scene: 'Kaito is glaring at the vending machine like it insulted his mother.',
      text: "Black coffee or green tea. Why is this harder than a championship point?",
      choices: [
        { text: "I'll pick for you.", aff: 3, react: "...Nobody's ever done that. I hate that I don't hate it.", expr: 'flustered' },
        { text: "Black coffee. You need the intensity.", aff: 2, react: "Tch. You know me too well. That's dangerous.", expr: 'smirk' },
        { text: "Just get both.", aff: 0, react: "That's... actually not stupid. Fine.", expr: 'surprised' }
      ]},
    { scene: 'Kaito accidentally shows you his phone wallpaper — a photo of you both after a match.',
      text: "That's NOT what it looks like! My sister set that! She's always messing with my phone!",
      choices: [
        { text: "We look good together.", aff: 3, react: "We look COMPETITIVE together! That's all!", expr: 'flustered' },
        { text: "Your sister has good taste.", aff: 2, react: "She's DEAD to me. ...She'd probably like you though.", expr: 'flustered' },
        { text: "It's a nice photo.", aff: 1, react: "Whatever. Delete it from your memory. NOW.", expr: 'annoyed' }
      ]},
    { scene: 'Thunder rumbles outside. Kaito flinches, then immediately tries to cover it.',
      text: "I'm not scared. I just... react to sudden stimuli. It's an athletic reflex.",
      choices: [
        { text: "You can grab my hand if you want.", aff: 3, react: "*grabs it instantly* This means NOTHING. Just tactical support.", expr: 'flustered' },
        { text: "Thunder is just noise. You're fine.", aff: 1, react: "I KNOW that. Tell my reflexes.", expr: 'annoyed' },
        { text: "Want to go inside?", aff: 2, react: "...Yeah. But only because the tables are inside.", expr: 'happy' }
      ]},
    { scene: 'Kaito has made a color-coded training schedule. Your name is written all over it.',
      text: "I made us a joint training plan. Ignore the star stickers. My sister got to it.",
      choices: [
        { text: "The stars are a nice touch, actually.", aff: 3, react: "She's GROUNDED. ...You really think so?", expr: 'flustered' },
        { text: "This is incredibly detailed. Impressive.", aff: 2, react: "Obviously. I don't do things halfway.", expr: 'happy' },
        { text: "Training on weekends too?", aff: 0, react: "Champions don't take days off.", expr: 'neutral' }
      ]},
    { scene: 'Kaito is sitting alone, turning his wristband over and over in his hands.',
      text: "My teammates said I push people away. That I'm too intense. ...Do you think that's true?",
      choices: [
        { text: "You let me in. That's what matters.", aff: 3, react: "...You're the exception. Don't know why. Don't wanna question it.", expr: 'happy' },
        { text: "You ARE intense. But that's what makes you you.", aff: 2, react: "Makes me... me? Tch. I'll take it.", expr: 'flustered' },
        { text: "Maybe tone it down sometimes?", aff: -1, react: "Great. Adding you to the list.", expr: 'annoyed' }
      ]},
    { scene: 'Kaito is waiting at your usual spot. He holds out a paddle with initials carved into the handle.',
      text: "I carved our initials into matching handles. For IDENTIFICATION purposes. Nothing else.",
      choices: [
        { text: "Matching paddles? We're a team now.", aff: 3, react: "A team... yeah. The best damn team.", expr: 'happy' },
        { text: "This is really thoughtful, Kaito.", aff: 2, react: "Don't tell anyone I have thoughts. Ruins the image.", expr: 'smirk' },
        { text: "Nice carving work.", aff: 1, react: "Cut myself three times. Worth it.", expr: 'neutral' }
      ]},
    { scene: 'Last day of extended season. Kaito stands tall, arms crossed, but his eyes are shining.',
      text: "Fourteen days. You survived fourteen days of me. Nobody's ever done that.",
      choices: [
        { text: "I'd survive fourteen more. Fourteen hundred.", aff: 3, react: "*jaw tightens, eyes glistening* ...Tch. You win. Not the match. Everything else.", expr: 'happy' },
        { text: "You made every single day count.", aff: 2, react: "Stop it. I'm trying to look tough for our last match.", expr: 'flustered' },
        { text: "It was one hell of a ride.", aff: 1, react: "Understatement of the century. Let's finish this.", expr: 'smirk' }
      ]}
  ],
  sora: [
    { scene: 'Sora is sketching near the ping pong table. He startles when he sees you.',
      text: "O-oh! Sorry, am I in the way? I like drawing here because the rhythm of the ball is... calming...",
      choices: [
        { text: "That's really poetic, actually.", aff: 3, react: "*blushes* Y-you think so? Nobody's ever said that to me...", expr: 'flustered' },
        { text: "Wanna play a round?", aff: 1, react: "M-me? I'm terrible, but... okay...", expr: 'surprised' },
        { text: "You're kind of blocking the table.", aff: -1, react: "I'm so sorry! I'll move— I'm always in the way...", expr: 'sad' }
      ]},
    { scene: 'Sora has a stack of books about ping pong technique beside his sketchpad.',
      text: "I-I read four books about paddle angles last night... I wanted to be less terrible when we played— I MEAN, for the game in general!",
      choices: [
        { text: "You studied for me? That's really sweet.", aff: 3, react: "S-sweet?! I just— I wanted to improve! That's all!", expr: 'flustered' },
        { text: "That's serious dedication!", aff: 2, react: "Th-thank you... research helps me feel less anxious.", expr: 'happy' },
        { text: "You could just practice instead of reading.", aff: -1, react: "O-oh... you're probably right... sorry...", expr: 'sad' }
      ]},
    { scene: 'Sora manages a clean serve for the first time. His eyes go wide.',
      text: "Did you see that?! I— oh, sorry for yelling... but did you SEE that serve?!",
      choices: [
        { text: "That was INCREDIBLE! Do it again!", aff: 3, react: "Y-you really think so?! Okay— watch this!", expr: 'happy' },
        { text: "Nice serve!", aff: 1, react: "Thank you! The book said to follow through with the wrist!", expr: 'happy' },
        { text: "It was okay.", aff: -1, react: "O-oh... okay is... better than terrible, I suppose...", expr: 'sad' }
      ]},
    { scene: 'It is raining. Sora is by the window, sketchpad open, watching the drops.',
      text: "Do you ever wonder if raindrops are playing their own tiny game? Bouncing off the glass like little ping pong rallies...",
      choices: [
        { text: "I love how you see the world.", aff: 3, react: "*turns bright red* I... no one's ever... thank you...", expr: 'flustered' },
        { text: "That's a cool way to think about it.", aff: 2, react: "It helps me not feel so overwhelmed by everything.", expr: 'happy' },
        { text: "It's just rain, dude.", aff: -1, react: "R-right... of course... I say weird things...", expr: 'sad' }
      ]},
    { scene: 'Sora approaches you first for once. He is clutching a sign-up form.',
      text: "U-um! I signed up for the tournament! I know I'll probably lose first round but... you made me want to try.",
      choices: [
        { text: "I'm so proud of you, Sora.", aff: 3, react: "*tears forming* Th-that means everything... truly...", expr: 'happy' },
        { text: "Good luck!", aff: 1, react: "Thank you! I'll definitely need it...", expr: 'happy' },
        { text: "Are you sure? You might get crushed.", aff: -1, react: "I... maybe you're right... I'll withdraw...", expr: 'sad' }
      ]},
    { scene: 'After a long day, Sora leads you to the school rooftop. The sky is full of stars.',
      text: "I come here when the anxiety gets bad... The stars make everything feel smaller. I've never shown anyone this spot.",
      choices: [
        { text: "I'm honored you'd share this with me.", aff: 3, react: "You make me feel brave enough to share things...", expr: 'happy' },
        { text: "It's a nice view.", aff: 1, react: "It is... I'm glad you like it.", expr: 'happy' },
        { text: "I'm not great with heights.", aff: 0, react: "Oh! W-we can go back down! I'm so sorry!", expr: 'surprised' }
      ]},
    { scene: 'Sora arrives with a quiet confidence you have never seen. Something has shifted.',
      text: "I won my first tournament match. Lost the second one, but... I won one. Because you believed in me.",
      choices: [
        { text: "You did that yourself. I just cheered.", aff: 3, react: "No... you did so much more than cheer. You saw me.", expr: 'happy' },
        { text: "Congrats, Sora!", aff: 2, react: "Thank you! One more match together?", expr: 'happy' },
        { text: "See? Reading paid off.", aff: 1, react: "Heh... maybe a little of both.", expr: 'happy' }
      ]},
    { scene: 'Sora is organizing his art supplies, humming softly to himself.',
      text: "I-I started humming in public! I never used to do that... You make me forget to be self-conscious.",
      choices: [
        { text: "Your voice is really nice.", aff: 3, react: "*covers mouth* Y-you heard?! Oh no... oh no oh no...", expr: 'flustered' },
        { text: "That's real progress!", aff: 2, react: "It is! Small steps... but they feel enormous.", expr: 'happy' },
        { text: "What song was it?", aff: 1, react: "I-it's embarrassing... it's from an anime...", expr: 'flustered' }
      ]},
    { scene: 'Sora shyly presents a small sketchbook filled with drawings of your matches.',
      text: "I-I drew all our matches from memory... Is that creepy? Please tell me it's not creepy.",
      choices: [
        { text: "It's the most beautiful thing I've ever seen.", aff: 3, react: "*clutches sketchbook* Y-you really mean that...?", expr: 'flustered' },
        { text: "These are amazing, Sora!", aff: 2, react: "I-I've been practicing... like you taught me to practice ping pong!", expr: 'happy' },
        { text: "A little intense, but cute.", aff: 0, react: "I-I'll burn it! No wait— I worked so hard on it...", expr: 'sad' }
      ]},
    { scene: 'Sora is standing in the rain without an umbrella, face tilted up, smiling.',
      text: "The rain sounds like applause. Like the sky is cheering for us.",
      choices: [
        { text: "Dance with me in it.", aff: 3, react: "*takes your hand* I-I've never danced before... but okay!", expr: 'happy' },
        { text: "You'll catch a cold!", aff: 1, react: "W-worth it. Some moments need to be felt.", expr: 'happy' },
        { text: "That's a beautiful thought.", aff: 2, react: "Everything is beautiful when you're around...", expr: 'flustered' }
      ]},
    { scene: 'Sora brings you homemade onigiri wrapped in a handkerchief.',
      text: "I-I made these! They're not perfect... I tried three times before these turned out okay...",
      choices: [
        { text: "Anything you make is perfect to me.", aff: 3, react: "*turns bright red* Y-you haven't even tried one yet!", expr: 'flustered' },
        { text: "Three batches? You're dedicated!", aff: 2, react: "I wanted them to be special... for a special person...", expr: 'flustered' },
        { text: "Let me try one right now!", aff: 1, react: "*watches anxiously* W-well?! How is it?!", expr: 'surprised' }
      ]},
    { scene: 'Sora is reading by the window. He scrambles to hide the cover when he sees you.',
      text: "O-oh! I was just reading a manga... The main character reminds me of... n-nevermind!",
      choices: [
        { text: "Reminds you of someone you know?", aff: 3, react: "*hides behind book* M-maybe! The one who plays ping pong with me!", expr: 'flustered' },
        { text: "What's it about?", aff: 1, react: "Two people who... find each other through... a sport...", expr: 'flustered' },
        { text: "I won't pry.", aff: 0, react: "...Thank you. B-but I kind of wanted you to pry...", expr: 'sad' }
      ]},
    { scene: 'Sora hands you a folded paper crane, carefully made.',
      text: "They say if you fold a thousand cranes, your wish comes true. This is number 512. I started the day I met you.",
      choices: [
        { text: "What are you wishing for?", aff: 3, react: "*whispers* I think you already know... *blushes furiously*", expr: 'flustered' },
        { text: "You've folded 512 cranes?!", aff: 2, react: "E-each one is a moment I wanted to remember with you.", expr: 'happy' },
        { text: "That's beautiful, Sora.", aff: 2, react: "You're the reason I started believing wishes could come true.", expr: 'happy' }
      ]},
    { scene: 'Final extended day. Sora stands tall — taller than you have ever seen him stand.',
      text: "Fourteen days ago, I couldn't even look someone in the eye. Now... I'm only shaking because of you.",
      choices: [
        { text: "You've become the bravest person I know.", aff: 3, react: "*tears streaming but smiling wide* Because you showed me how!", expr: 'happy' },
        { text: "Let's make this last match count.", aff: 2, react: "Every match with you counts. Every single one.", expr: 'happy' },
        { text: "I'm so proud of who you've become.", aff: 2, react: "I became this... because someone finally believed in me.", expr: 'flustered' }
      ]}
  ],
  haruki: [
    { scene: 'Haruki is doing trick shots, bouncing the ball off the ceiling and catching it behind his back.',
      text: "Ooh~ A new face! Rate my trick shot. Scale of 1 to 'fall in love with me.'",
      choices: [
        { text: "Solid 'fall in love.'", aff: 3, react: "Ahaha! Bold on day one! I like you already, sunshine~", expr: 'happy' },
        { text: "That was pretty impressive!", aff: 1, react: "Just impressive? I'm wounded, darling~", expr: 'smirk' },
        { text: "Shouldn't you hit it over the net?", aff: 0, react: "Rules are for people without sparkle, sunshine~", expr: 'smirk' }
      ]},
    { scene: 'Haruki has placed random items on the ping pong table — books, a shoe, a stuffed animal.',
      text: "Welcome to EXTREME ping pong! I added some... creative obstacles. Scared~?",
      choices: [
        { text: "I'm terrified and thrilled. Let's go.", aff: 3, react: "A kindred spirit of beautiful chaos! Perfection~!", expr: 'happy' },
        { text: "Is this even allowed?", aff: 1, react: "Allowed? Where's the fun in allowed~?", expr: 'smirk' },
        { text: "Can we just play normal?", aff: -1, react: "Booooring. You're breaking my heart, sunshine.", expr: 'annoyed' }
      ]},
    { scene: 'Haruki pulls you aside with a conspiratorial grin.',
      text: "Let's make a bet~ If I win, you owe me a favor. If YOU win... I'll tell you a secret about me.",
      choices: [
        { text: "You're on. I want that secret.", aff: 3, react: "Ooh~ Motivated! I love high stakes with pretty people~", expr: 'happy' },
        { text: "What kind of secret?", aff: 2, react: "Wouldn't YOU like to know~ That's the whole point, darling.", expr: 'smirk' },
        { text: "That sounds risky...", aff: -1, react: "Tch. Playing it safe is the biggest risk of all.", expr: 'annoyed' }
      ]},
    { scene: 'You catch Haruki alone, without his usual grin. He looks tired. Smaller somehow.',
      text: "Oh— Hey! I was just— *puts on a smile* —planning my next masterpiece! What's up~?",
      choices: [
        { text: "You don't have to perform for me.", aff: 3, react: "...How do you always see through me?", expr: 'surprised' },
        { text: "Are you okay?", aff: 2, react: "...I will be. Thanks for actually asking.", expr: 'happy' },
        { text: "What masterpiece?", aff: 0, react: "Haha~ Wouldn't you like to know~ *deflects perfectly*", expr: 'smirk' }
      ]},
    { scene: 'Haruki finds you and sits unusually close. No jokes. No props.',
      text: "Everyone thinks I'm just the class clown. But sometimes I wonder if anyone would notice if the jokes stopped.",
      choices: [
        { text: "I'd notice. In a heartbeat.", aff: 3, react: "...You mean that, don't you? I can tell when people mean it.", expr: 'happy' },
        { text: "Your jokes are great though!", aff: 1, react: "Thanks. But that's not what I meant.", expr: 'neutral' },
        { text: "People love you for more than jokes.", aff: 2, react: "Do they? Or do they love the character I play?", expr: 'surprised' }
      ]},
    { scene: 'Haruki teaches you his signature spin serve. He grabs your wrist to adjust your form.',
      text: "The trick is in the wrist~ Here, let me show you... *takes your hand* Oops, too forward~?",
      choices: [
        { text: "Not forward enough.", aff: 3, react: "OH? Where was THIS energy on day one~?!", expr: 'flustered' },
        { text: "Y-your hand is warm.", aff: 2, react: "Aww, are you flustered? That's supposed to be MY thing~!", expr: 'smirk' },
        { text: "Just show me the technique.", aff: -1, react: "All business? Fine fine~ *sighs dramatically*", expr: 'annoyed' }
      ]},
    { scene: 'Last day. Haruki is waiting with no props, no grin. Just him.',
      text: "Last day, huh? I wrote you something. Don't read it until after our match. Promise me?",
      choices: [
        { text: "I promise. This means a lot, Haruki.", aff: 3, react: "...Good. Now let's play, before I get embarrassingly honest.", expr: 'happy' },
        { text: "What is it?", aff: 1, react: "You'll see~ Some things are worth waiting for, darling.", expr: 'smirk' },
        { text: "You? Writing something serious?", aff: -1, react: "I CAN be serious! ...Sometimes. Shut up.", expr: 'annoyed' }
      ]},
    { scene: 'Haruki is wearing a ridiculous headband with a ping pong ball glued to it.',
      text: "Don't ask where I got this. It involves a dare, a vending machine, and a stray cat.",
      choices: [
        { text: "I need to hear that story immediately.", aff: 3, react: "It starts with 'I definitely should NOT have done that' and ends with a headband~", expr: 'happy' },
        { text: "It suits you, honestly.", aff: 2, react: "Everything suits me. Especially accessories born of chaos~", expr: 'smirk' },
        { text: "Please take that off.", aff: -1, react: "NEVER. This headband is my soul now, darling.", expr: 'annoyed' }
      ]},
    { scene: 'Haruki is teaching younger students trick shots. He looks genuinely happy.',
      text: "Oh! Caught me being a decent human being. Quick, someone destroy the evidence~",
      choices: [
        { text: "The mask slips again. You're actually wonderful.", aff: 3, react: "...Stop that. I have a brand to destroy— I mean maintain.", expr: 'flustered' },
        { text: "You're a great teacher!", aff: 2, react: "The secret is 90% chaos energy, 10% actual technique~", expr: 'happy' },
        { text: "Can you teach me too?", aff: 1, react: "Private lessons~? My my, how bold of you.", expr: 'smirk' }
      ]},
    { scene: 'Haruki pulls out two matching wristbands woven from old ping pong net string.',
      text: "Made these from the net we destroyed that one time. Recycling! Friendship! Evidence disposal~!",
      choices: [
        { text: "I'm wearing this forever.", aff: 3, react: "...Forever is a long time. I like long times with you, sunshine.", expr: 'flustered' },
        { text: "We make a perfect team of chaos.", aff: 2, react: "The BEST team. Agents of beautiful destruction~", expr: 'happy' },
        { text: "We broke a net?", aff: 0, react: "Details, details~ Focus on the WRISTBAND.", expr: 'smirk' }
      ]},
    { scene: 'Haruki is uncharacteristically sitting still, watching the sunset from the gym steps.',
      text: "I used to think stillness was boring. But sitting still with you... it's the loudest my heart has ever been.",
      choices: [
        { text: "Mine too.", aff: 3, react: "*leans against you* ...Don't move. This is perfect.", expr: 'happy' },
        { text: "That was surprisingly poetic.", aff: 2, react: "I contain multitudes~! And also snacks. Want some?", expr: 'smirk' },
        { text: "Are you feeling okay?", aff: 0, react: "Better than okay. For once, I'm not performing.", expr: 'happy' }
      ]},
    { scene: 'Haruki has organized a mini ping pong festival. Streamers and balloons everywhere.',
      text: "I may have gone overboard. But go big or go home, and I never want to go home when you're here~",
      choices: [
        { text: "You did all this for us?", aff: 3, react: "For you. The 'us' part is the bonus I was hoping for, darling.", expr: 'flustered' },
        { text: "This is amazing!", aff: 2, react: "You should see the balloon budget. It's... significant~", expr: 'happy' },
        { text: "Overboard is your middle name.", aff: 1, react: "Haruki 'Overboard' Endo. Has a ring to it~", expr: 'smirk' }
      ]},
    { scene: 'Haruki is reading a note he wrote you. He has not given it to you yet.',
      text: "I keep rewriting this stupid note. Nine drafts. Nothing captures what you— um. Hi. Didn't see you there.",
      choices: [
        { text: "Just tell me. Forget the note.", aff: 3, react: "...You make me want to be real. That's terrifying. And wonderful.", expr: 'flustered' },
        { text: "Take your time. I'll wait.", aff: 2, react: "You always wait for me. Nobody else does that.", expr: 'happy' },
        { text: "Draft number 10?", aff: 1, react: "Draft 10 just says 'I like you' 63 times. It's honest at least~", expr: 'flustered' }
      ]},
    { scene: 'Final extended day. Haruki stands without his usual pose. No finger guns. No wink. Just him.',
      text: "Fourteen days. Fourteen versions of me. But you liked all of them. Even the real one.",
      choices: [
        { text: "Especially the real one.", aff: 3, react: "...Then the real one is all yours. No tricks. No act. Just Haruki.", expr: 'happy' },
        { text: "Every version of you is the real one.", aff: 2, react: "How do you always know exactly what to say? It's unfair, sunshine.", expr: 'flustered' },
        { text: "Let's make this last day count.", aff: 1, react: "Every day with you counted. This one just counts... louder.", expr: 'happy' }
      ]}
  ]
};

/* ════════════════════════════════════════════════════════════
   POST-MATCH REACTIONS — BOYS
   ════════════════════════════════════════════════════════════ */
var MATCH_REACTIONS_BOYS = {
  kaito: {
    perfect: "Tch... Okay. OKAY. That was... impressive. I'm not even mad. ...Much.",
    nice: "Not bad. You actually made me work for it.",
    close: "Close one. You're getting dangerous.",
    loss: "Ha. Better luck next time, rookie.",
    bad_loss: "...That was painful to watch. We're training. Now."
  },
  sora: {
    perfect: "W-wow! You're like a ping pong prodigy! That was incredible!",
    nice: "You played so beautifully! I learned so much watching you!",
    close: "Th-that was so intense! My heart is still pounding...",
    loss: "I-I won? Really? Oh my gosh... thank you for playing with me!",
    bad_loss: "I'm sorry... that must have been frustrating. Want to practice together?"
  },
  haruki: {
    perfect: "Well well WELL~ Looks like I've been thoroughly outclassed. How delightful~",
    nice: "Not bad, not bad~ You've earned my respect, sunshine... and that's rare.",
    close: "Ooh, a nail-biter! My absolute favorite kind of match~",
    loss: "Hehe~ Looks like the trickster wins today. Better luck next time, darling~",
    bad_loss: "Oh sunshine... that was rough. Let me take you under my wing~"
  }
};

/* ════════════════════════════════════════════════════════════
   FOLLOW-UP DIALOGUE — BOYS — 2 extra beats per day × 14 days
   ════════════════════════════════════════════════════════════ */
var FOLLOWUPS_BOYS = {
  kaito: [
    [{ text: "You didn't flinch at my serve. Most people flinch.", choices: [
        { text: "I was too focused on you to flinch.", aff: 2, react: "On ME?! On my FORM. You meant my form.", expr: 'flustered' },
        { text: "Nerves of steel.", aff: 1, react: "We'll see about that.", expr: 'smirk' }]},
     { text: "Ready to back up that confidence?", choices: [
        { text: "Always.", aff: 1, react: "Good answer.", expr: 'smirk' },
        { text: "Only if you promise a rematch.", aff: 2, react: "Tch. Already planning ahead. I respect that.", expr: 'happy' }]}],
    [{ text: "Your backhand is garbage, by the way. Want me to fix it?", choices: [
        { text: "Yes please, coach.", aff: 2, react: "*adjusts your grip* There. ...Your hand is soft.", expr: 'flustered' },
        { text: "My backhand is fine!", aff: 0, react: "It's really not. But whatever.", expr: 'annoyed' }]},
     { text: "I don't usually offer to help people. So don't waste this.", choices: [
        { text: "I feel honored.", aff: 2, react: "Don't let it go to your head.", expr: 'smirk' },
        { text: "Why me?", aff: 1, react: "...Good question. Next topic.", expr: 'flustered' }]}],
    [{ text: "Heard you've been asking about me. Cute.", choices: [
        { text: "Guilty. I wanted to know everything about you.", aff: 3, react: "*ears turn red* E-everything?!", expr: 'flustered' },
        { text: "Just scouting my opponent.", aff: 1, react: "Smart. Know your enemy.", expr: 'smirk' }]},
     { text: "One question. Anything. Go.", choices: [
        { text: "What makes you happy?", aff: 2, react: "...This. Right now. Don't make it weird.", expr: 'happy' },
        { text: "What's your win record?", aff: 0, react: "152-2. The two still keep me up at night.", expr: 'neutral' }]}],
    [{ text: "I brought an extra water bottle. For you. Don't read into it.", choices: [
        { text: "Too late, I'm reading into it.", aff: 2, react: "Tch. You're impossible.", expr: 'flustered' },
        { text: "Thanks, Kaito.", aff: 1, react: "...You're welcome. Whatever.", expr: 'happy' }]},
     { text: "My sister says I talk about you too much. She's lying.", choices: [
        { text: "What do you say about me?", aff: 2, react: "NOTHING. She's making stuff up. Let's play.", expr: 'flustered' },
        { text: "Tell her I said hi.", aff: 1, react: "Absolutely not.", expr: 'annoyed' }]}],
    [{ text: "Remember when I said I only care about winning?", choices: [
        { text: "That was clearly a lie.", aff: 2, react: "...Yeah. It was.", expr: 'happy' },
        { text: "People change.", aff: 1, react: "Tch. Let's play before I get sappy.", expr: 'flustered' }]},
     { text: "After this match, wanna grab food? I know a ramen place.", choices: [
        { text: "Like a date?", aff: 3, react: "Like a— I said RAMEN. It's just RAMEN.", expr: 'flustered' },
        { text: "Sure, I'm starving.", aff: 1, react: "Cool. Casual. No big deal. Let's go.", expr: 'happy' }]}],
    [{ text: "Couldn't sleep last night. Kept thinking about... the tournament.", choices: [
        { text: "Just the tournament?", aff: 2, react: "...Mostly.", expr: 'flustered' },
        { text: "Nervous?", aff: 1, react: "Me? Never. ...Okay, maybe a little.", expr: 'neutral' }]},
     { text: "If I win the whole thing, I'm dedicating it to... someone.", choices: [
        { text: "To me?", aff: 2, react: "DON'T FLATTER YOURSELF. ...But also don't not.", expr: 'flustered' },
        { text: "Your family?", aff: 1, react: "Yeah. Them too.", expr: 'happy' }]}],
    [{ text: "Whatever happens today... I need you to know something.", choices: [
        { text: "I'm listening.", aff: 2, react: "You always are. That's what I need you to know.", expr: 'happy' },
        { text: "You're scaring me.", aff: 1, react: "Heh. The great Kaito Tanaka, scary. ...Sorry.", expr: 'smirk' }]},
     { text: "One more rally. Just you and me. No score.", choices: [
        { text: "For fun?", aff: 2, react: "For us.", expr: 'happy' },
        { text: "You're going soft, Tanaka.", aff: 1, react: "Tell anyone and you're dead.", expr: 'smirk' }]}],
    [{ text: "I keep replaying our first match in my head.", choices: [
        { text: "Nostalgic already?", aff: 2, react: "For you? ...Maybe.", expr: 'flustered' },
        { text: "You've improved so much since then.", aff: 1, react: "So have you. That's the problem.", expr: 'smirk' }]},
     { text: "Want to see my secret training spot?", choices: [
        { text: "I'd follow you anywhere.", aff: 2, react: "You already do. It's annoyingly endearing.", expr: 'flustered' },
        { text: "Lead the way.", aff: 1, react: "Try to keep up.", expr: 'happy' }]}],
    [{ text: "My mom wants to meet 'the person I keep mentioning.'", choices: [
        { text: "You talk about me to your MOM?", aff: 2, react: "She EAVESDROPPED. I didn't TELL her.", expr: 'flustered' },
        { text: "I'd love to meet her.", aff: 2, react: "She'd either adopt you or challenge you. Probably both.", expr: 'happy' }]},
     { text: "If I gave you a nickname, would you use it?", choices: [
        { text: "Only if I get to nickname you too.", aff: 2, react: "...Ace. Because you're my ace.", expr: 'flustered' },
        { text: "Depends on the nickname.", aff: 1, react: "Fair. I'll workshop it.", expr: 'smirk' }]}],
    [{ text: "The rain makes me want to stay inside. With you.", choices: [
        { text: "Best rainy day plan ever.", aff: 2, react: "...Yeah. It really is.", expr: 'happy' },
        { text: "We could practice inside.", aff: 1, react: "Always about practice. But... I like that about you.", expr: 'smirk' }]},
     { text: "I saved your water bottle cap. Don't ask why.", choices: [
        { text: "That's weirdly romantic.", aff: 2, react: "It's NOT romantic! It's... evidence.", expr: 'flustered' },
        { text: "I won't ask.", aff: 1, react: "Good. Because the answer is embarrassing.", expr: 'flustered' }]}],
    [{ text: "My teammates say I smile more now. I blamed the weather.", choices: [
        { text: "It's definitely not the weather.", aff: 2, react: "Shut UP.", expr: 'flustered' },
        { text: "Smiling looks good on you.", aff: 2, react: "Don't— I'm supposed to look INTIMIDATING.", expr: 'flustered' }]},
     { text: "I want to play doubles with you someday. Us against everyone.", choices: [
        { text: "Partners forever.", aff: 2, react: "...Yeah. Partners.", expr: 'happy' },
        { text: "We'd crush everyone.", aff: 1, react: "Obviously. We're unstoppable.", expr: 'smirk' }]}],
    [{ text: "I've been thinking about what I'd say if this was our last match.", choices: [
        { text: "What would you say?", aff: 2, react: "...Ask me again after we play.", expr: 'flustered' },
        { text: "It won't be our last.", aff: 1, react: "Promise?", expr: 'happy' }]},
     { text: "My biggest fear? That this ends.", choices: [
        { text: "It doesn't have to.", aff: 2, react: "...Okay. Then it won't.", expr: 'happy' },
        { text: "We'll make it last.", aff: 1, react: "Starting right now.", expr: 'smirk' }]}],
    [{ text: "No trash talk today. I just want to look at you.", choices: [
        { text: "I'm looking right back.", aff: 2, react: "*small genuine smile* Good.", expr: 'happy' },
        { text: "You're making me blush.", aff: 1, react: "Welcome to MY world.", expr: 'smirk' }]},
     { text: "After this... there's something I need to tell you. Win or lose.", choices: [
        { text: "I already know.", aff: 2, react: "...Maybe. But I want to say it anyway.", expr: 'flustered' },
        { text: "I'm all ears.", aff: 1, react: "Good. Because my heart is all... yours.", expr: 'flustered' }]}],
    [{ text: "This is it. The last one. I'm not ready.", choices: [
        { text: "Neither am I. And that's okay.", aff: 2, react: "Since when are YOU the comforting one?", expr: 'flustered' },
        { text: "We've got this.", aff: 1, react: "We. I like that word.", expr: 'happy' }]},
     { text: "May the best player win. ...Even if it's you.", choices: [
        { text: "Especially if it's me.", aff: 2, react: "HA! One last cocky moment. I respect it.", expr: 'smirk' },
        { text: "We both win today.", aff: 2, react: "...Yeah. We do.", expr: 'happy' }]}]
  ],
  sora: [
    [{ text: "I-I made you a bookmark! It has a little ping pong paddle on it...", choices: [
        { text: "This is the sweetest thing anyone's given me.", aff: 2, react: "R-really?! I made seven before getting one right...", expr: 'flustered' },
        { text: "Thanks, Sora!", aff: 1, react: "I'm so glad you like it! I was so worried...", expr: 'happy' }]},
     { text: "U-um... what kind of music do you listen to? I want to know more about you.", choices: [
        { text: "I'd rather hear about your favorites.", aff: 2, react: "O-oh! I have a playlist! A very long one...", expr: 'happy' },
        { text: "I'm more of a podcast person.", aff: 0, react: "Podcasts are great too! W-we could listen together sometime...", expr: 'surprised' }]}],
    [{ text: "I practiced my serve 300 times last night. I counted every one.", choices: [
        { text: "Your dedication is incredible.", aff: 2, react: "I just... wanted to be worth playing against...", expr: 'flustered' },
        { text: "300?! Don't hurt yourself.", aff: 1, react: "My shoulder is a little sore... but it's worth it.", expr: 'happy' }]},
     { text: "Can I tell you something strange? I dream about ping pong now.", choices: [
        { text: "Am I in the dreams?", aff: 2, react: "I— th-that's— MOVING ON.", expr: 'flustered' },
        { text: "That's not weird at all.", aff: 1, react: "Really? You don't think I'm strange?", expr: 'happy' }]}],
    [{ text: "The sunset is beautiful tonight. Like watercolors bleeding into canvas.", choices: [
        { text: "Not as beautiful as you.", aff: 3, react: "*drops pencils* I— you can't just SAY things like—!", expr: 'flustered' },
        { text: "You should paint it.", aff: 1, react: "I... actually started one. Last night. In secret.", expr: 'surprised' }]},
     { text: "Nobody's ever spent this much time with me before. On purpose.", choices: [
        { text: "Their loss. Seriously.", aff: 2, react: "...Thank you. That means everything.", expr: 'happy' },
        { text: "You're easy to be around.", aff: 1, react: "That's... the nicest thing anyone's ever told me.", expr: 'happy' }]}],
    [{ text: "I was reading about how constellations were named. It's a lot like friendship.", choices: [
        { text: "Tell me about it.", aff: 2, react: "Really?! You want to hear? *lights up* So, ancient people connected dots...", expr: 'happy' },
        { text: "You're such a nerd.", aff: -1, react: "O-oh... sorry, I know it's boring...", expr: 'sad' }]},
     { text: "I brought us tea. Chamomile. I-it helps with nerves before a match.", choices: [
        { text: "You think of everything.", aff: 2, react: "I like taking care of... people.", expr: 'flustered' },
        { text: "I could use some calm.", aff: 1, react: "Me too. *sips together in comfortable silence*", expr: 'happy' }]}],
    [{ text: "My mom asked about you. I-I didn't know what to say.", choices: [
        { text: "Tell her I'm your biggest fan.", aff: 2, react: "*covers face* She'd never stop teasing me!", expr: 'flustered' },
        { text: "What did she ask?", aff: 1, react: "If you're... kind. I said the kindest.", expr: 'happy' }]},
     { text: "I wrote a haiku about today. Want to hear?", choices: [
        { text: "Please. I'd love that.", aff: 2, react: "'Ping pong ball takes flight / Your laugh across the table / My heart returns serve'", expr: 'flustered' },
        { text: "Go for it!", aff: 1, react: "Okay... *deep breath* It's about... us. Sort of.", expr: 'happy' }]}],
    [{ text: "I-I've been braver lately. I even raised my hand in class.", choices: [
        { text: "I'm so proud of you, Sora.", aff: 2, react: "*tears up a little* Y-you always believe in me...", expr: 'happy' },
        { text: "Growth looks good on you.", aff: 2, react: "...That's the kind of thing that makes me brave.", expr: 'flustered' }]},
     { text: "After today's match... can we go to the rooftop again?", choices: [
        { text: "I'd follow you anywhere.", aff: 2, react: "P-please don't say things like that when I'm trying not to cry!", expr: 'flustered' },
        { text: "Our spot. I'll be there.", aff: 1, react: "*smiles quietly* Our spot. I like that.", expr: 'happy' }]}],
    [{ text: "I want to say something I've been rehearsing. Out loud. To you.", choices: [
        { text: "Take your time. I'm here.", aff: 2, react: "*deep breath* You make the world less frightening. There. I said it.", expr: 'happy' },
        { text: "You can tell me anything.", aff: 1, react: "I know. That's why this is so hard. And so easy.", expr: 'flustered' }]},
     { text: "One last game. Then... whatever comes next.", choices: [
        { text: "Together.", aff: 2, react: "Together. *grips paddle tight* ...Let's play.", expr: 'happy' },
        { text: "You're going to be amazing.", aff: 1, react: "Because of you.", expr: 'happy' }]}],
    [{ text: "I-I tried a new hairstyle today. D-do you notice anything different?", choices: [
        { text: "You look incredible.", aff: 2, react: "*touches hair* Y-you really think so?!", expr: 'flustered' },
        { text: "New style?", aff: 1, react: "Y-yes! I parted it differently... took me an hour...", expr: 'happy' }]},
     { text: "Reading poetry helps me be brave. Want to hear some?", choices: [
        { text: "Always.", aff: 2, react: "'Two paddles, one table, infinite possibility.' ...It's about us.", expr: 'flustered' },
        { text: "Go for it!", aff: 1, react: "*recites softly* I hope I didn't mess it up...", expr: 'happy' }]}],
    [{ text: "I made a playlist for our matches. E-each song reminds me of you.", choices: [
        { text: "Play it for me.", aff: 2, react: "*puts in earbuds nervously* The first song is called 'Courage'...", expr: 'flustered' },
        { text: "How many songs?", aff: 1, react: "T-twenty-seven. One for each time you made me smile.", expr: 'happy' }]},
     { text: "My journal has more pages about you than about anything else.", choices: [
        { text: "I'm honored to be in your story.", aff: 2, react: "You ARE my story... at least the best chapter.", expr: 'flustered' },
        { text: "What do you write?", aff: 1, react: "M-moments. The ones that feel like magic.", expr: 'happy' }]}],
    [{ text: "The rain stopped but cherry blossoms are falling. Nature is putting on a show.", choices: [
        { text: "Dance with me under the blossoms.", aff: 2, react: "*takes your hand* I-I'll try not to step on your feet!", expr: 'flustered' },
        { text: "It's beautiful.", aff: 1, react: "Not as beautiful as— n-nevermind!", expr: 'flustered' }]},
     { text: "I packed us bento. I-I shaped the rice balls like ping pong paddles!", choices: [
        { text: "You're the most thoughtful person alive.", aff: 2, react: "I just... want to make you smile. It's my favorite thing.", expr: 'happy' },
        { text: "This is adorable!", aff: 1, react: "They kept falling apart but I didn't give up!", expr: 'happy' }]}],
    [{ text: "I gave a presentation in class today. About someone who inspired me.", choices: [
        { text: "Was it about me?", aff: 2, react: "*nods slowly* E-everyone clapped. I almost passed out.", expr: 'flustered' },
        { text: "That's incredible, Sora!", aff: 1, react: "I k-kept imagining you in the audience. It helped.", expr: 'happy' }]},
     { text: "Do you believe in fate? Like some people are meant to meet?", choices: [
        { text: "I believe in us.", aff: 2, react: "...That's better than fate. That's choice.", expr: 'happy' },
        { text: "Maybe. We did meet.", aff: 1, react: "The best maybe of my life.", expr: 'flustered' }]}],
    [{ text: "I finished all 1000 paper cranes. My wish... it already came true.", choices: [
        { text: "What was the wish?", aff: 2, react: "*whispers* You. It was always you.", expr: 'flustered' },
        { text: "Sora, that's incredible.", aff: 1, react: "My fingers are sore. But my heart is full.", expr: 'happy' }]},
     { text: "I'm not shaking anymore. Look. Steady hands.", choices: [
        { text: "Because you found your strength.", aff: 2, react: "Because I found someone worth being strong for.", expr: 'happy' },
        { text: "You've grown so much.", aff: 1, react: "Only because you gave me room to grow.", expr: 'flustered' }]}],
    [{ text: "I want to read you the last page of my journal. No more secrets.", choices: [
        { text: "I'm ready to hear it.", aff: 2, react: "'Today I stop being afraid. Today I tell them everything.'", expr: 'happy' },
        { text: "Sora...", aff: 1, react: "Don't cry! I-I'll start crying too!", expr: 'flustered' }]},
     { text: "Last match. My hands are trembling again. But it's the good kind.", choices: [
        { text: "Hold my hand until they stop.", aff: 2, react: "*holds tight* ...They stopped. You're magic.", expr: 'flustered' },
        { text: "You've got this.", aff: 1, react: "WE'VE got this.", expr: 'happy' }]}],
    [{ text: "No words today. Just... *shows you a painting of both of you playing ping pong*", choices: [
        { text: "*hugs him*", aff: 2, react: "*hugs back tightly* D-don't let go yet...", expr: 'happy' },
        { text: "Frame this. It's a masterpiece.", aff: 2, react: "It's us. That's what makes it perfect.", expr: 'flustered' }]},
     { text: "Ready? ...I am. Finally.", choices: [
        { text: "Together, one last time.", aff: 2, react: "Together. Always.", expr: 'happy' },
        { text: "Show them what you've got.", aff: 1, react: "I'll show YOU. That's all that matters.", expr: 'happy' }]}]
  ],
  haruki: [
    [{ text: "Fun fact: I once won a match playing left-handed. While eating a rice ball.", choices: [
        { text: "I don't believe you but I adore you for it.", aff: 2, react: "Adore~?! On day one?! Someone's eager~!", expr: 'happy' },
        { text: "Pics or it didn't happen.", aff: 1, react: "The pics are classified. Top secret pong intel, darling.", expr: 'smirk' }]},
     { text: "So what's YOUR story? Why ping pong~?", choices: [
        { text: "I came for the pong, stayed for you.", aff: 2, react: "Oh STOP~ ...No wait, continue. I like this.", expr: 'happy' },
        { text: "I just like hitting things.", aff: 1, react: "A kindred spirit of beautiful violence~!", expr: 'smirk' }]}],
    [{ text: "I have a theory: you can tell everything about a person by their serve~", choices: [
        { text: "What does mine say about me?", aff: 2, react: "That you're genuine. Earnest. ...Annoyingly charming.", expr: 'happy' },
        { text: "That's ridiculous.", aff: 0, react: "See? Skeptic serve. Exactly what I predicted~", expr: 'smirk' }]},
     { text: "Wanna see something cool? I put glow-in-the-dark tape on a paddle~", choices: [
        { text: "You're an absolute menace and I'm here for it.", aff: 2, react: "FINALLY someone who appreciates ART~!", expr: 'happy' },
        { text: "Is that tournament legal?", aff: -1, react: "You sound like the ref. Boring~", expr: 'annoyed' }]}],
    [{ text: "I bet you think I'm always this chaotic. Truth is... I choose to be.", choices: [
        { text: "The real question is who you are when you choose not to be.", aff: 3, react: "...You're dangerously perceptive. I like it and I hate it.", expr: 'surprised' },
        { text: "Chaos is fun.", aff: 1, react: "It IS~! See, you get it, sunshine.", expr: 'happy' }]},
     { text: "When I was little, I was actually really quiet. Hard to believe, right~?", choices: [
        { text: "I can actually see it.", aff: 2, react: "...How? Nobody else can.", expr: 'surprised' },
        { text: "What changed?", aff: 1, react: "I got tired of being invisible. So I became impossible to ignore.", expr: 'neutral' }]}],
    [{ text: "Okay, real talk. Rate our chemistry. Scale of 1 to dynamite~", choices: [
        { text: "Nuclear.", aff: 2, react: "Nuclear?! That's past my scale! I need a bigger chart~!", expr: 'happy' },
        { text: "Solid 7.", aff: 1, react: "SEVEN? Offended but motivated. Watch me make it a 10, darling.", expr: 'smirk' }]},
     { text: "My friends say I flirt with everyone. But with you it's... different.", choices: [
        { text: "Different how?", aff: 2, react: "Different like... I actually mean it. Wow, did I just say that out loud?", expr: 'flustered' },
        { text: "I noticed.", aff: 1, react: "Of course you did. You notice everything about me.", expr: 'happy' }]}],
    [{ text: "I named a new trick shot after you. Want to see it~?", choices: [
        { text: "What's it called?", aff: 2, react: "The Heartbreaker. Because it always lands~ *winks*", expr: 'smirk' },
        { text: "I'm honored.", aff: 1, react: "You should be. I don't name shots after just anyone, sunshine.", expr: 'happy' }]},
     { text: "Do you think people can really change? Like, deep down?", choices: [
        { text: "I think you already are.", aff: 3, react: "...Okay, that actually got me. Point to you.", expr: 'flustered' },
        { text: "Why do you ask?", aff: 1, react: "No reason. ...Every reason. Same thing.", expr: 'neutral' }]}],
    [{ text: "Didn't sleep. Kept thinking about what you said yesterday.", choices: [
        { text: "Which part?", aff: 1, react: "All of it. Every word. I have a very specific problem and it's you.", expr: 'happy' },
        { text: "Good thoughts?", aff: 2, react: "The best kind. The scary kind. ...Same thing.", expr: 'flustered' }]},
     { text: "After this match, I want to show you my real laugh. Not the performance one.", choices: [
        { text: "I've been waiting for that.", aff: 2, react: "...How did you know there was a different one?", expr: 'surprised' },
        { text: "Deal.", aff: 1, react: "Deal. *genuine small smile*", expr: 'happy' }]}],
    [{ text: "No tricks today. No bits. Just... us.", choices: [
        { text: "I like 'us.'", aff: 2, react: "Me too. And it terrifies me. In the best way.", expr: 'happy' },
        { text: "The real Haruki. Finally.", aff: 2, react: "He's been here the whole time. You're just the first to look.", expr: 'flustered' }]},
     { text: "Whatever I wrote in that note... know that every single word is true.", choices: [
        { text: "I already know.", aff: 2, react: "...Then let's play. One last time. For real.", expr: 'happy' },
        { text: "I can't wait to read it.", aff: 1, react: "Be gentle with it. It's the most honest thing I've ever done.", expr: 'flustered' }]}],
    [{ text: "I memorized your play style. Every quirk. It's research, not obsession~", choices: [
        { text: "What did you learn?", aff: 2, react: "That you bite your lip when you focus. It's lethal, sunshine.", expr: 'flustered' },
        { text: "I memorized yours too.", aff: 1, react: "OH~? Pop quiz later then.", expr: 'smirk' }]},
     { text: "My prank folder has a new section: 'pranks to do together.'", choices: [
        { text: "I'm in.", aff: 2, react: "Bonnie and Clyde but make it ping pong~", expr: 'happy' },
        { text: "What's the first prank?", aff: 1, react: "Classified until you pass the initiation, darling~", expr: 'smirk' }]}],
    [{ text: "Told my best friend about you. He says I'm 'disgustingly smitten.'", choices: [
        { text: "Disgustingly smitten suits you.", aff: 2, react: "Gross. ...Do I really look smitten though?", expr: 'flustered' },
        { text: "Tell him I said thanks.", aff: 1, react: "He already wants to meet you. I said absolutely not. For now~", expr: 'smirk' }]},
     { text: "Would you play ping pong in the rain? With me~?", choices: [
        { text: "I'd play anything, anywhere, with you.", aff: 2, react: "*pauses* ...That's the most Haruki-proof answer possible.", expr: 'flustered' },
        { text: "The ball would get slippery.", aff: 0, react: "PHYSICS isn't the POINT, sunshine!", expr: 'annoyed' }]}],
    [{ text: "I stopped wearing my 'performance smile' around you weeks ago.", choices: [
        { text: "I noticed. The real smile is better.", aff: 2, react: "...How did you always tell the difference?", expr: 'flustered' },
        { text: "Good. I prefer the real Haruki.", aff: 2, react: "He prefers you too. Obviously~", expr: 'happy' }]},
     { text: "Let's make a time capsule. Just our stuff~", choices: [
        { text: "Brilliant. What goes in first?", aff: 2, react: "This moment. Right here. Captured forever.", expr: 'happy' },
        { text: "Where do we bury it?", aff: 1, react: "Under the ping pong table. Obviously~", expr: 'smirk' }]}],
    [{ text: "I dreamt we were old and still playing ping pong. Terrible but laughing.", choices: [
        { text: "That sounds like the perfect future.", aff: 2, react: "*goes quiet* ...Yeah. Perfect.", expr: 'flustered' },
        { text: "We'd never be terrible.", aff: 1, react: "True. We'd be LEGENDARILY terrible~", expr: 'smirk' }]},
     { text: "Quick: three words to describe me. No thinking. Go.", choices: [
        { text: "Brilliant. Chaotic. Mine.", aff: 3, react: "*speechless for once* ...Okay you WIN.", expr: 'flustered' },
        { text: "Funny, deep, unforgettable.", aff: 1, react: "Unforgettable. That one's going on my gravestone~", expr: 'happy' }]}],
    [{ text: "I started journaling. Tell no one. The class clown can't have FEELINGS.", choices: [
        { text: "Your feelings are your superpower.", aff: 2, react: "...Okay that's going straight in the journal.", expr: 'flustered' },
        { text: "Secret's safe with me.", aff: 1, react: "I know. That's why I told you.", expr: 'happy' }]},
     { text: "All my tricks and schemes... they were just ways to get your attention.", choices: [
        { text: "You had my attention from day one.", aff: 2, react: "Then everything after was just... showing off. For you.", expr: 'flustered' },
        { text: "They worked.", aff: 1, react: "Mission accomplished~ ...Now what?", expr: 'happy' }]}],
    [{ text: "I thought of a joke but it's not funny. It's just true.", choices: [
        { text: "Tell me anyway.", aff: 2, react: "You're the best thing that's ever happened to me. ...See? Not funny at all.", expr: 'flustered' },
        { text: "The best jokes are true.", aff: 1, react: "Then my whole life is hilarious. Especially the you part.", expr: 'happy' }]},
     { text: "No deflecting today. I'm just going to look at you and be grateful.", choices: [
        { text: "I'm grateful too.", aff: 2, react: "...This is the scariest thing I've ever done. Being honest.", expr: 'flustered' },
        { text: "You're full of surprises.", aff: 1, react: "One more surprise after our match. I promise~", expr: 'happy' }]}],
    [{ text: "Last day. No pranks. No bits. Just me.", choices: [
        { text: "Just you is everything.", aff: 2, react: "...I practiced not crying and I'm already failing.", expr: 'flustered' },
        { text: "Let's make it count.", aff: 1, react: "Every second with you counts. It always did, sunshine.", expr: 'happy' }]},
     { text: "One last trick~ *holds up a card that says 'Will you be my Player 2?'*", choices: [
        { text: "Always. Forever. Yes.", aff: 2, react: "*laughing through tears* Best trick I ever pulled~", expr: 'happy' },
        { text: "That's the best trick yet.", aff: 1, react: "Saved the best for last. Just like you, darling.", expr: 'flustered' }]}]
  ]
};

/* ════════════════════════════════════════════════════════════
   THIRD FOLLOW-UP — BOYS — one more conversation beat before match
   ════════════════════════════════════════════════════════════ */
var FOLLOWUPS_3_BOYS = {
  kaito: [
    { text: "You're the first person who doesn't bore me. That's not a compliment. It's a warning.", choices: [
      { text: "High praise from the champion.", aff: 2, react: "Don't get used to compliments.", expr: 'smirk' },
      { text: "You don't bore me either.", aff: 1, react: "Obviously. I'm terrifying.", expr: 'happy' }]},
    { text: "I watched your match against Hayashi. You've got raw potential.", choices: [
      { text: "You watched my match?!", aff: 2, react: "For RESEARCH. Don't be weird.", expr: 'flustered' },
      { text: "Any tips?", aff: 1, react: "Hit harder. Think less. ...One of those is bad advice.", expr: 'smirk' }]},
    { text: "My hands are shaking. I never shake. What are you doing to me?", choices: [
      { text: "Maybe you're excited.", aff: 2, react: "Excited? About YOU? ...Maybe.", expr: 'flustered' },
      { text: "Maybe you need to eat.", aff: 0, react: "Romance: zero. But you're probably right.", expr: 'annoyed' }]},
    { text: "I called you my rival to my team. They said that's not what rivals look like.", choices: [
      { text: "What do rivals look like?", aff: 2, react: "Not like... this. Apparently I smile too much around you.", expr: 'flustered' },
      { text: "We're more than rivals.", aff: 2, react: "Don't say that before a match. I need to focus.", expr: 'flustered' }]},
    { text: "I keep the scorecard from our first match. It's in my gym bag.", choices: [
      { text: "Sentimental for someone who 'only cares about winning.'", aff: 2, react: "I WILL destroy you. ...Right after this moment.", expr: 'flustered' },
      { text: "I kept mine too.", aff: 2, react: "...We're both idiots, aren't we?", expr: 'happy' }]},
    { text: "I want to tell you something after the match. Promise you'll stay.", choices: [
      { text: "I'm not going anywhere.", aff: 2, react: "*deep breath* Okay. Good. Let's play.", expr: 'happy' },
      { text: "Wild horses couldn't drag me away.", aff: 1, react: "Dramatic. I like it. Now let's GO.", expr: 'smirk' }]},
    { text: "I'm going to play my absolute best today. Because you deserve nothing less.", choices: [
      { text: "So will I. For you.", aff: 2, react: "May the best heart win. ...I said heart. I meant player.", expr: 'flustered' },
      { text: "Bring it on, Tanaka.", aff: 1, react: "There's the fire. I've been waiting for that.", expr: 'happy' }]},
    { text: "You know my coffee order. That's... significant.", choices: [
      { text: "I pay attention to you.", aff: 2, react: "...Nobody else does. Not like that.", expr: 'flustered' },
      { text: "Black, no sugar. Like you.", aff: 1, react: "Did you just call me BITTER?! ...Fair.", expr: 'flustered' }]},
    { text: "My sister found the training schedule. She drew hearts all over it again.", choices: [
      { text: "Smart sister.", aff: 2, react: "She's GROUNDED.", expr: 'flustered' },
      { text: "Are the hearts accurate?", aff: 1, react: "...No comment.", expr: 'flustered' }]},
    { text: "This storm feels alive. Like a championship point.", choices: [
      { text: "You make ME feel alive.", aff: 2, react: "...Okay. That was good. I'll give you that.", expr: 'flustered' },
      { text: "Let's play through it.", aff: 1, react: "Now you're speaking my language.", expr: 'happy' }]},
    { text: "I filmed myself practicing. I look insane. Want to see?", choices: [
      { text: "You look passionate. That's amazing.", aff: 2, react: "Amazing?! I look like a LUNATIC.", expr: 'flustered' },
      { text: "Send it to me.", aff: 1, react: "If this leaks I will END you.", expr: 'smirk' }]},
    { text: "Everyone at school thinks we're together. I didn't correct them.", choices: [
      { text: "Neither did I.", aff: 2, react: "...Oh. So we're both just... letting that happen?", expr: 'flustered' },
      { text: "Are we?", aff: 2, react: "I— that's— MATCH TIME.", expr: 'flustered' }]},
    { text: "I wrote your name in the margin of my notebook. In tiny letters.", choices: [
      { text: "In a heart?", aff: 2, react: "...It was a STRATEGIC CIRCLE.", expr: 'flustered' },
      { text: "I wrote yours too.", aff: 2, react: "...We're BOTH idiots.", expr: 'happy' }]},
    { text: "Today I play for real. Everything I have. Because you're worth it.", choices: [
      { text: "You're worth everything too.", aff: 2, react: "...Don't make me emotional before a match, idiot.", expr: 'flustered' },
      { text: "Give me your best shot.", aff: 1, react: "My best shot is reserved for people I— I mean people I RESPECT.", expr: 'flustered' }]}
  ],
  sora: [
    { text: "I-I've been meaning to ask... what's your favorite color? For... research purposes.", choices: [
      { text: "Whatever color your eyes are.", aff: 3, react: "*drops everything* Y-you can't just— ! My heart— !", expr: 'flustered' },
      { text: "Blue. Like the sky.", aff: 1, react: "Blue is calming. I like blue too.", expr: 'happy' }]},
    { text: "I made flashcards for spin techniques. There are 52 of them.", choices: [
      { text: "Show me all 52.", aff: 2, react: "Really?! Most people give up after five!", expr: 'happy' },
      { text: "You're the most dedicated person I know.", aff: 2, react: "O-only because you give me something to be dedicated for...", expr: 'flustered' }]},
    { text: "Someone was rude to me and I stood up for myself. First time ever.", choices: [
      { text: "Sora, that's HUGE.", aff: 2, react: "I kept thinking 'what would they think?' ...Them being you.", expr: 'flustered' },
      { text: "What did you say?", aff: 1, react: "I said 'please stop.' But I said it FIRMLY.", expr: 'happy' }]},
    { text: "I pressed leaves from the day we first met. I-is that weird?", choices: [
      { text: "It's the most Sora thing ever. I love it.", aff: 2, react: "You say my name like it's something precious...", expr: 'flustered' },
      { text: "Which leaves?", aff: 1, react: "Maple leaves. From the tree near the ping pong table.", expr: 'happy' }]},
    { text: "My anxiety was terrible today. But then I remembered we'd play together.", choices: [
      { text: "I'm glad I can be that for you.", aff: 2, react: "You're my favorite kind of calm.", expr: 'happy' },
      { text: "We don't have to play if you're not up for it.", aff: 1, react: "No— I WANT to. You make everything better.", expr: 'happy' }]},
    { text: "I finished a whole poem about someone. Want the first line?", choices: [
      { text: "Every word.", aff: 2, react: "'In the space between serves, I found a home.' ...You're the home.", expr: 'flustered' },
      { text: "Save it for after the match.", aff: 1, react: "O-okay. Something to look forward to.", expr: 'happy' }]},
    { text: "No matter what happens today: you changed my life.", choices: [
      { text: "You changed mine too, Sora.", aff: 2, react: "*tears falling but smiling* Let's play. Through the tears.", expr: 'happy' },
      { text: "We changed each other.", aff: 2, react: "That's the most beautiful thing I've ever heard.", expr: 'flustered' }]},
    { text: "I-I actually raised my hand in class again today! Without spiraling!", choices: [
      { text: "Look at you, conquering the world!", aff: 2, react: "Just one classroom... but it felt like the world!", expr: 'happy' },
      { text: "What did you say?", aff: 1, react: "I gave the right answer! The teacher smiled!", expr: 'happy' }]},
    { text: "I drew a manga panel of us. Y-you're the hero and I'm... the love interest.", choices: [
      { text: "Can I keep it?", aff: 2, react: "Y-yes! I made a copy because I knew you'd ask!", expr: 'flustered' },
      { text: "You're the hero of your own story.", aff: 2, react: "...With you as my co-author?", expr: 'flustered' }]},
    { text: "The blossoms are falling again. They remind me of when we first played.", choices: [
      { text: "Every petal is a memory.", aff: 2, react: "I want to press them all...", expr: 'happy' },
      { text: "Let's make new memories today.", aff: 1, react: "E-each one more precious than the last.", expr: 'flustered' }]},
    { text: "I named my cactus after you. It's thriving.", choices: [
      { text: "Like us.", aff: 2, react: "L-like... us? *blushes to ears*", expr: 'flustered' },
      { text: "What kind of cactus?", aff: 1, react: "A moon cactus. Because you light up my darkness.", expr: 'happy' }]},
    { text: "I read a quote: 'The bravest thing is to be gentle.' You taught me that.", choices: [
      { text: "You were always gentle. You just needed courage.", aff: 2, react: "And you gave me that. Every single day.", expr: 'happy' },
      { text: "You're the gentlest person I know.", aff: 1, react: "O-only because you showed me it was safe to be.", expr: 'flustered' }]},
    { text: "I finished crane number 999. Only one more.", choices: [
      { text: "Let me fold the last one with you.", aff: 2, react: "*tears up* T-together? The last one? ...Yes.", expr: 'flustered' },
      { text: "Your wish is almost complete.", aff: 1, react: "It already came true. This crane is just the proof.", expr: 'happy' }]},
    { text: "I'm not scared anymore. Not of ping pong. Not of speaking up. Not of... feeling.", choices: [
      { text: "You're the bravest person in this room.", aff: 2, react: "Only because you're IN the room with me.", expr: 'happy' },
      { text: "Feelings aren't scary when they're real.", aff: 2, react: "...It's the most real thing I've ever felt.", expr: 'flustered' }]}
  ],
  haruki: [
    { text: "Pop quiz~! What's my favorite food? 3 seconds. Go.", choices: [
      { text: "Something chaotic. Takoyaki with extra everything.", aff: 2, react: "CORRECT! Are you psychic or just perfect~?!", expr: 'happy' },
      { text: "No idea.", aff: 0, react: "Unacceptable. You have homework now, sunshine.", expr: 'smirk' }]},
    { text: "I ranked everyone in this gym. You're number one~", choices: [
      { text: "Too late. It's gone to my heart.", aff: 2, react: "CORNY! ...But effective. Ugh~", expr: 'flustered' },
      { text: "What's the criteria?", aff: 1, react: "Vibes, chaos tolerance, smile quality. You aced all three~", expr: 'smirk' }]},
    { text: "My best friend says I sound 'dangerously smitten.'", choices: [
      { text: "Dangerously? So on-brand.", aff: 2, react: "Everything I do is dangerous, darling~", expr: 'smirk' },
      { text: "Are you? Smitten?", aff: 2, react: "...Next question.", expr: 'flustered' }]},
    { text: "I've been less funny lately. Want to know why~?", choices: [
      { text: "Because you're being real instead.", aff: 3, react: "Stop seeing through me. It's rude. And amazing.", expr: 'flustered' },
      { text: "You're still pretty funny.", aff: 1, react: "Thanks. But funny isn't what I'm going for anymore.", expr: 'happy' }]},
    { text: "I carved our initials into the gym bench. The coach was NOT pleased~", choices: [
      { text: "You're unhinged and I adore you.", aff: 2, react: "That's the nicest— I'm not crying, you're crying.", expr: 'flustered' },
      { text: "We're going to get in trouble.", aff: 0, react: "Worth it. Some things need to be permanent, sunshine.", expr: 'happy' }]},
    { text: "Can I ask something real? No jokes, no deflecting.", choices: [
      { text: "Always.", aff: 2, react: "Do you see me? The real me? Not the show?", expr: 'surprised' },
      { text: "I'm listening.", aff: 1, react: "...You always are. That's the answer, isn't it?", expr: 'happy' }]},
    { text: "I'm scared. Not of losing. Of what happens when the games are over.", choices: [
      { text: "Then we'll find new games. Together.", aff: 2, react: "...Promise?", expr: 'happy' },
      { text: "Endings are just new beginnings.", aff: 1, react: "The old me would mock that. The new me believes it.", expr: 'flustered' }]},
    { text: "I started a 'things that aren't pranks' list. You're on it~", choices: [
      { text: "What else is on the list?", aff: 2, react: "Just you. That's the whole list.", expr: 'flustered' },
      { text: "I'm honored.", aff: 1, react: "You should be. That list is VERY exclusive, darling~", expr: 'smirk' }]},
    { text: "I actually apologized to the coach. About the initials.", choices: [
      { text: "Character growth!", aff: 2, react: "Ugh, don't make it a THING. I just felt bad.", expr: 'flustered' },
      { text: "What did he say?", aff: 1, react: "He said 'about time.' Fair.", expr: 'smirk' }]},
    { text: "Do you think there's a universe where we never met~?", choices: [
      { text: "Then I'd spend that life looking for you.", aff: 2, react: "...That's the most anime thing anyone's ever said to me.", expr: 'flustered' },
      { text: "Impossible. We were always going to meet.", aff: 2, react: "Destiny~? From YOU? I'm swooning.", expr: 'happy' }]},
    { text: "I made you a playlist but every song title spells out a message~", choices: [
      { text: "What does it spell?", aff: 2, react: "...Y-O-U-M-A-K-E-M-E-R-E-A-L. Don't laugh!", expr: 'flustered' },
      { text: "You're such a romantic.", aff: 1, react: "I am NOT— okay I totally am.", expr: 'flustered' }]},
    { text: "My performance persona has a name. Today he's off duty.", choices: [
      { text: "What's his name?", aff: 1, react: "'Sparkle Haruki.' He's retiring. The real one is better~", expr: 'happy' },
      { text: "I like the off-duty version.", aff: 2, react: "He likes you too. More than like.", expr: 'flustered' }]},
    { text: "I tried writing you a song. It's terrible. Want to hear it~?", choices: [
      { text: "Every note.", aff: 2, react: "*sings badly* 'You're my ace, my favorite face~' ...I TOLD you it was terrible.", expr: 'flustered' },
      { text: "I bet it's perfect.", aff: 1, react: "Perfectly terrible. Which is perfectly us~", expr: 'happy' }]},
    { text: "No performance. No persona. No filter. Just: I'm grateful you exist.", choices: [
      { text: "Come here.", aff: 2, react: "*walks into hug* ...Best trick I never planned.", expr: 'happy' },
      { text: "Same. Completely same.", aff: 1, react: "Then let's exist together. For as long as possible, sunshine.", expr: 'flustered' }]}
  ]
};

/* ════════════════════════════════════════════════════════════
   POST-MATCH WALKS — BOYS
   ════════════════════════════════════════════════════════════ */
var POST_MATCH_BOYS = {
  kaito: { win: [
    { text: "Tch. Fine. You won. ...Walk with me?", choices: [
      { text: "Lead the way.", aff: 2, react: "*falls into step, unusually quiet, but smiling*", expr: 'happy' },
      { text: "Only if you admit I'm good.", aff: 1, react: "You're... adequate. *tries not to smile*", expr: 'smirk' }]},
    { text: "Two wins now. You're starting to scare me.", choices: [
      { text: "Scared looks cute on you.", aff: 2, react: "I am NOT cute. I am TERRIFYING.", expr: 'flustered' },
      { text: "Good.", aff: 1, react: "...Yeah. It is good.", expr: 'happy' }]},
    { text: "I'm buying you a victory drink. Non-negotiable.", choices: [
      { text: "Is this a date?", aff: 2, react: "It's a DRINK. ...Fine. Maybe.", expr: 'flustered' },
      { text: "You're being generous. Who are you?", aff: 1, react: "Temporary insanity. Enjoy it.", expr: 'smirk' }]}
  ], loss: [
    { text: "Better luck next time. ...You okay though?", choices: [
      { text: "Losing to you doesn't feel like losing.", aff: 2, react: "...That's the smoothest thing you've ever said.", expr: 'flustered' },
      { text: "I'll get you next time.", aff: 1, react: "THAT'S the spirit!", expr: 'happy' }]},
    { text: "Hey. Chin up. You played better than you think.", choices: [
      { text: "Are you... comforting me?", aff: 2, react: "NO. Stating facts. ...You okay?", expr: 'flustered' },
      { text: "Thanks, Kaito.", aff: 1, react: "Don't mention it. Seriously. To anyone.", expr: 'happy' }]},
    { text: "I pushed you hard. You took it. That takes guts.", choices: [
      { text: "I'd take anything from you.", aff: 2, react: "W-what is THAT supposed to mean?!", expr: 'flustered' },
      { text: "You make me want to be better.", aff: 1, react: "...Good. That's really good.", expr: 'happy' }]}
  ]},
  sora: { win: [
    { text: "You were incredible! C-can I walk with you? I'm not ready to say goodbye.", choices: [
      { text: "I'm never ready to say goodbye to you.", aff: 2, react: "*walks close, shoulder brushing yours* S-sorry! Was that okay?!", expr: 'flustered' },
      { text: "Of course, Sora.", aff: 1, react: "*happy silence, walking in perfect step*", expr: 'happy' }]},
    { text: "I made us matching phone charms. Tiny ping pong paddles. T-too much?", choices: [
      { text: "I'm putting this on my phone right now.", aff: 2, react: "*watches with shining eyes* It looks perfect...", expr: 'happy' },
      { text: "This is adorable!", aff: 1, react: "I stayed up until 3am painting them...", expr: 'flustered' }]},
    { text: "Walking home is my favorite part of the day now. Because of... the route.", choices: [
      { text: "Because of the company.", aff: 2, react: "...Y-yes. Specifically... yours.", expr: 'flustered' },
      { text: "Mine too.", aff: 1, react: "*smiles at the ground the entire way home*", expr: 'happy' }]}
  ], loss: [
    { text: "I-I'm sorry I won! Please don't be upset with me!", choices: [
      { text: "Sora, you SHOULD be proud.", aff: 2, react: "...Nobody's ever told me to be proud of myself before.", expr: 'happy' },
      { text: "I'm happy for you.", aff: 1, react: "That makes me happier than winning...", expr: 'flustered' }]},
    { text: "Want to practice together? M-maybe it would help...", choices: [
      { text: "I'd love a practice date.", aff: 2, react: "D-D-DATE?! I said PRACTICE! *face combusts*", expr: 'flustered' },
      { text: "That would be great.", aff: 1, react: "I'll bring snacks and color-coded notes!", expr: 'happy' }]},
    { text: "You let me win, didn't you? Please say you didn't.", choices: [
      { text: "You won fair and square.", aff: 2, react: "Then... I really AM getting better... *tears up*", expr: 'happy' },
      { text: "You were just better today.", aff: 1, react: "B-better? Me? I need to sit down...", expr: 'flustered' }]}
  ]},
  haruki: { win: [
    { text: "Well played, champ~ Victory walk. I'll be your entourage.", choices: [
      { text: "I'd rather you walk beside me.", aff: 2, react: "...Beside. Not behind. Noted. *softens*", expr: 'happy' },
      { text: "Entourage of one?", aff: 1, react: "Quality over quantity, sunshine~", expr: 'smirk' }]},
    { text: "I owe you ice cream. Winner's rules. I just invented this rule~", choices: [
      { text: "I love rules you invent.", aff: 2, react: "New rule: this is now weekly.", expr: 'happy' },
      { text: "What flavor?", aff: 1, react: "Chaos flavor. Every topping they have~", expr: 'smirk' }]},
    { text: "Fun fact: I've never walked anyone home before. You're the test run~", choices: [
      { text: "How am I doing?", aff: 2, react: "Five stars. Would walk again.", expr: 'happy' },
      { text: "I'm honored.", aff: 1, react: "Most charming test subject I've ever had, sunshine~", expr: 'smirk' }]}
  ], loss: [
    { text: "Don't feel bad~ I cheat at everything. Except feelings.", choices: [
      { text: "You have feelings?", aff: 2, react: "Rude~! But fair. Not hidden from you, though.", expr: 'flustered' },
      { text: "What feelings?", aff: 1, react: "Wouldn't YOU like to know~ ...Yes.", expr: 'smirk' }]},
    { text: "Consolation prize: you pick the music for our walk~", choices: [
      { text: "Something we can sing badly together.", aff: 2, react: "PERFECT answer. You really do get me, darling~", expr: 'happy' },
      { text: "Your choice.", aff: 1, react: "Bold. You trust my taste? Dangerous~", expr: 'smirk' }]},
    { text: "Losing to me isn't really losing. It's... delayed winning~", choices: [
      { text: "Is that Haruki philosophy?", aff: 2, react: "It's OUR philosophy now. Exclusively, sunshine.", expr: 'happy' },
      { text: "That's actually comforting.", aff: 1, react: "Don't tell anyone I comfort people.", expr: 'smirk' }]}
  ]}
};

/* ════════════════════════════════════════════════════════════
   MORNING TEXTS — BOYS
   ════════════════════════════════════════════════════════════ */
var MORNING_TEXTS_BOYS = {
  kaito: [null, "Don't be late. I warmed up extra.", "Dreamed I lost to you. Woke up pissed.",
    "Bring your A-game. I'm in a mood.", "...Hey. Thanks for yesterday.",
    "Almost texted you last night. Almost.", "Last day. Don't you dare make it easy.",
    "New week. Same fire. Miss me?", "Showed my sister our schedule. She laughed.",
    "Thunder can't scare me. Much.", "The new paddle has YOUR initial too.",
    "Today I don't wanna compete. Just... be.", "Carved it. Zero regrets.",
    "14 days. You survived me. Barely."],
  sora: [null, "G-good morning! I hope you slept well...", "Found a four-leaf clover for you!",
    "Been smiling all morning. Mom noticed.", "Wrote three poems last night. About... ping pong.",
    "Nervous about today. But the good kind.", "Whatever happens, thank you. For everything.",
    "I hummed in public today! Progress!", "Drew us in my sketchbook. D-don't look!",
    "Rain sounds like tiny ping pong balls...", "Onigiri attempt #4. Getting better!",
    "I-I finished the whole manga series...", "Crane #512. Still folding.",
    "Fourteen days and I'm not shaking anymore."],
  haruki: [null, "rise and shine sunshine~ round 2?", "wildest dream. you were in it. no details~",
    "fun fact: thought about you for 15 hours straight", "real talk. I missed you. there I said it.",
    "learned a new trick. but I'd rather just talk.", "last day. no tricks. just us.",
    "headband update: still wearing it. no regrets~", "caught being a good person. send backup.",
    "wristband check! still wearing yours?", "sat still for 6 minutes. new personal record.",
    "the balloon budget was absolutely worth it~", "draft 9 of the note. almost honest enough.",
    "fourteen days. zero regrets. one you."]
};

/* ════════════════════════════════════════════════════════════
   ENDINGS — BOYS
   ════════════════════════════════════════════════════════════ */
var ENDINGS_BOYS = {
  kaito: {
    label: "KAITO'S CONFESSION",
    speech: "\"I'm not good at this. I'm good at winning, not at... feelings. But you... you're the first person who made losing feel like gaining something.\"\n\n*He looks away, jaw clenched, ears red*\n\n\"So... same time tomorrow? ...Every tomorrow?\"",
    narration: "Kaito catches you after the final match. His grip on the paddle is white-knuckled, but his eyes are the softest you've ever seen them."
  },
  sora: {
    label: "SORA'S CONFESSION",
    speech: "\"I-I wrote something for you... It's every moment that made my heart race. Every serve, every smile, every time you made me brave enough to try...\"\n\n*He's trembling but smiling wide*\n\n\"The last page is blank. Because... I want us to write it together.\"",
    narration: "Sora hands you a small handmade book, his hands shaking. When you open it, every page is filled with sketches and memories of your time together."
  },
  haruki: {
    label: "HARUKI'S CONFESSION",
    speech: "\"I stopped performing the day you started seeing me.\"\n\n*He's smiling but his eyes are glistening*\n\n\"No jokes. No tricks. You're my favorite person. And I don't say that to anyone.\n\n...Play one more game with me? Just for fun?\"",
    narration: "The note Haruki gave you has just one line. When you look up, his usual mask is gone — and the real Haruki is more beautiful than any trick he's ever pulled."
  },
  kaito_friend: {
    label: "KAITO'S FRIENDSHIP",
    speech: "\"You know what? You're the best training partner I've ever had. And I don't say that lightly.\"\n\n*He punches your shoulder*\n\n\"Same time next season. That's not a request.\"",
    narration: "Kaito walks you out after the final match. He's not confessing — but the respect in his eyes says more than words."
  },
  sora_friend: {
    label: "SORA'S FRIENDSHIP",
    speech: "\"Th-thank you for being my friend. A real one. You taught me that the world isn't as scary as I thought.\"\n\n*He hands you a paper crane*\n\n\"This one's for you. For good luck.\"",
    narration: "Sora is still shy, but he stands a little taller now. You helped him find his voice, even if romance wasn't in the cards."
  },
  haruki_friend: {
    label: "HARUKI'S FRIENDSHIP",
    speech: "\"You know, not everyone gets to see the real me. But you did. And you stuck around anyway.\"\n\n*He grins — the real grin*\n\n\"Keep being weird, sunshine. The world needs it.\"",
    narration: "Haruki drops the act and gives you a genuine hug. Not romantic — but real. And for Haruki, real is everything."
  },
  none: {
    label: "SEASON'S END",
    speech: "The season is over. You played some good matches and met some interesting people.",
    narration: "Maybe next time, you'll get to know someone a little better. The ping pong table will be waiting."
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
   RIVAL SCENES — BOYS
   ════════════════════════════════════════════════════════════ */
var RIVAL_SCENES_BOYS = {
  kaito_sora: { text: "Kaito spots Sora walking with you. \"Tch. So you're spending time with HIM too? ...Whatever.\" His jaw tightens.", charKey: 'kaito' },
  kaito_haruki: { text: "Kaito catches you laughing with Haruki. \"Having fun with the class clown? Remember who the real competition is.\" He looks away.", charKey: 'kaito' },
  sora_kaito: { text: "Sora sees Kaito's arm around your shoulder. \"O-oh... you two are close... I see...\" He looks down at his shoes.", charKey: 'sora' },
  sora_haruki: { text: "Sora watches you joking with Haruki. \"I-I wish I could be that funny... maybe then you'd...\" He trails off.", charKey: 'sora' },
  haruki_kaito: { text: "Haruki sees you training with Kaito. \"So the fierce one has your attention today~? I see how it is.\" His smile doesn't reach his eyes.", charKey: 'haruki' },
  haruki_sora: { text: "Haruki notices you with Sora's bookmark. \"Cute~ He made you something. I should try harder, huh?\" He's only half joking.", charKey: 'haruki' }
};

/* ════════════════════════════════════════════════════════════
   GIFTS — BOYS
   ════════════════════════════════════════════════════════════ */
var GIFTS_BOYS = {
  energy_drink: { name: 'Energy Drink', emoji: '\u26A1', match: 'kaito',
    reaction_match: "Tch. You got this for me? ...It's my favorite brand. How did you even know?",
    reaction_other: "Oh, uh... thanks? I'm more of a tea person but... I appreciate the thought." },
  letter: { name: 'Handwritten Letter', emoji: '\u2709\uFE0F', match: 'sora',
    reaction_match: "*reads silently, tears forming* Th-this is the most beautiful thing anyone's ever given me...",
    reaction_other: "A letter? That's... sweet. Not really my thing but the effort means a lot~" },
  sticker: { name: 'Lucky Sticker Pack', emoji: '\u2B50', match: 'haruki',
    reaction_match: "STICKERS~! You KNOW me, sunshine! I'm putting one on EVERYTHING!",
    reaction_other: "Stickers? Cute, I guess. Not exactly my style but... thanks." }
};
var GIFT_KEYS_BOYS = ['energy_drink', 'letter', 'sticker'];
