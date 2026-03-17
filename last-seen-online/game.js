/* ═══════════════════════════════════════════════════════════════
   Last Seen Online — game.js
   Interactive chat story  ·  SlayPlay Arcade
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────── *
   *  STORY DATA                                                  *
   * ──────────────────────────────────────────────────────────── */

  const CONTACTS = {
    jordan: {
      name: 'Jordan',
      avatar: 'J',
      color: '#5856d6',
      lastSeen: 'last seen 3 weeks ago',
      preview: 'I just need to know you\'re okay.',
      unread: 12,
      messages: [
        // Month 1 — warm, present, inside jokes
        { ts: 'July 12', type: 'header' },
        { from: 'jordan', text: 'dude guess what' },
        { from: 'jordan', text: 'I finally beat your high score on that dumb snake game' },
        { from: 'alex', text: 'LIAR. screenshot or it didn\'t happen' },
        { from: 'jordan', text: 'check your leaderboard and WEEP' },
        { from: 'alex', text: 'okay wow. respect. but I\'m coming for you this weekend' },
        { from: 'jordan', text: 'bring it \u{1F624}' },
        { from: 'alex', text: 'also can we do that ramen place Saturday? I\'ve been thinking about their tonkotsu all week' },
        { from: 'jordan', text: 'yes absolutely. 7pm? I\'ll drive' },
        { from: 'alex', text: 'perfect. you\'re the best' },

        // Month 2 — still good but first hint
        { ts: 'August 3', type: 'header' },
        { from: 'jordan', text: 'yo that new show everyone\'s talking about is actually incredible' },
        { from: 'alex', text: 'which one??' },
        { from: 'jordan', text: 'the one about the time loop detective' },
        { from: 'alex', text: 'oh I was gonna start that! no spoilers' },
        { from: 'jordan', text: 'my lips are sealed. but episode 4... just... prepare yourself' },
        { from: 'alex', text: 'now I HAVE to watch it tonight' },

        { ts: 'August 18', type: 'header' },
        { from: 'jordan', text: 'you good? you were kinda quiet at dinner last night' },
        { from: 'alex', text: 'yeah just tired. work has been a lot lately' },
        { from: 'jordan', text: 'you sure? you can talk to me about anything you know' },
        { from: 'alex', text: 'I know. really, I\'m fine. just need a good night\'s sleep' },
        { from: 'jordan', text: '\u2764\uFE0F okay. take care of yourself' },

        { ts: 'August 29', type: 'header' },
        { from: 'jordan', text: 'remember that weird guy at the ramen place who kept singing to his soup' },
        { from: 'alex', text: 'HAHA yes. serenade to miso' },
        { from: 'jordan', text: 'iconic. we need to go back and see if he\'s still there' },
        { from: 'alex', text: 'deal. this weekend?' },
        { from: 'jordan', text: 'it\'s a date' },

        // Month 3-4 — pulling back
        { ts: 'September 5', type: 'header' },
        { from: 'jordan', text: 'movie night Friday?? the whole crew is in' },
        { from: 'alex', text: 'might have to skip this one, sorry. got a thing' },
        { from: 'jordan', text: 'a thing? what thing?' },
        { from: 'alex', text: 'just stuff. next time for sure' },
        { from: 'jordan', text: 'you said that last time too' },

        { ts: 'September 15', type: 'header' },
        { from: 'jordan', text: 'so I went to the ramen place by myself' },
        { from: 'jordan', text: 'singing guy wasn\'t there. felt weird without you' },
        { from: 'alex', text: 'sorry I couldn\'t make it' },
        { from: 'jordan', text: 'it\'s fine, I just miss hanging out' },

        { ts: 'September 22', type: 'header' },
        { from: 'jordan', text: 'hey haven\'t seen you in like 2 weeks. everything cool?' },
        { from: 'alex', text: 'yeah just busy' },
        { from: 'jordan', text: 'okay... wanna grab coffee tomorrow? even just 20 min?' },
        { from: 'alex', text: 'maybe' },
        // choice 1 triggers here
        { from: 'jordan', text: 'Did I do something wrong?', choice: 'jordan1' },

        // Month 5-6 — one word replies, distance
        { ts: 'October 8', type: 'header' },
        { from: 'jordan', text: 'I called you twice today' },
        { from: 'jordan', text: 'are you ignoring me or just busy' },

        { ts: 'October 15', type: 'header' },
        { from: 'jordan', text: 'Alex. come on. talk to me' },
        { from: 'alex', text: 'sorry' },
        { from: 'jordan', text: 'sorry for WHAT? I don\'t even know what\'s going on' },
        { from: 'jordan', text: 'I sent you that long message last week and you just... read it?' },
        { from: 'jordan', text: 'read', type: 'receipt', status: 'read' },

        { ts: 'November 8', type: 'header' },
        { from: 'jordan', text: 'I drove past the ramen place today' },
        { from: 'jordan', text: 'remember when you ate so fast you literally choked and the waiter had to bring you extra water' },
        { from: 'jordan', text: 'I miss that. I miss you.' },
        // choice 2 triggers here
        { from: 'jordan', text: 'I know something is wrong. I can feel it. You don\'t have to explain everything. You don\'t have to be okay. I just want to be there. Please let me be there.', choice: 'jordan2' },

        // Month 7-8 — no response, just waiting
        { ts: 'December 3', type: 'header' },
        { from: 'jordan', text: 'your birthday is next week' },
        { from: 'jordan', text: 'I got you something stupid. you\'ll hate it. (you\'ll love it)' },

        { ts: 'December 10', type: 'header' },
        { from: 'jordan', text: 'happy birthday Alex' },
        { from: 'jordan', text: 'I left it on your porch. the thing you\'ll hate.' },
        { from: 'jordan', text: 'read', type: 'receipt', status: 'unread' },

        { ts: 'January 4', type: 'header' },
        { from: 'jordan', text: 'happy new year' },
        { from: 'jordan', text: 'I made a resolution to not give up on you' },

        { ts: 'January 14', type: 'header' },
        { from: 'jordan', text: 'saw your light was on last night' },
        { from: 'jordan', text: 'at least I know you\'re there' },

        { ts: 'January 28', type: 'header' },
        { from: 'jordan', text: 'I still have that stupid voicemail you left me last summer' },
        { from: 'jordan', text: 'the one where you were laughing so hard you couldn\'t even talk' },
        { from: 'jordan', text: 'I listened to it today' },

        { ts: 'February 2', type: 'header' },
        { from: 'jordan', text: 'I don\'t know if you still read these' },
        { from: 'jordan', text: 'I just need to know you\'re okay.' },
        { from: 'jordan', text: 'read', type: 'receipt', status: 'unread' },
      ]
    },

    mom: {
      name: 'Mom',
      avatar: 'M',
      color: '#ff6b6b',
      lastSeen: 'last seen 2 weeks ago',
      preview: 'I\'m coming over Saturday.',
      unread: 8,
      messages: [
        { ts: 'July 8', type: 'header' },
        { from: 'mom', text: 'Hi sweetie! Made that pasta thing you like. Want the recipe?' },
        { from: 'alex', text: 'YES please! I tried to make it last week and it was a disaster' },
        { from: 'mom', text: 'The secret is more garlic than you think is reasonable \u{1F604}' },
        { from: 'alex', text: 'noted. love you mom' },
        { from: 'mom', text: 'Love you more! Dad says hi' },
        { from: 'alex', text: 'tell dad I said hi back and that he still owes me a rematch at chess' },

        { ts: 'August 1', type: 'header' },
        { from: 'mom', text: 'Your cousin Sarah had the baby!! 8 lbs 3 oz. Little girl named Lily \u{1F338}' },
        { from: 'alex', text: 'awww!! that\'s amazing. send pics!' },
        { from: 'mom', text: 'Sending a million. Brace yourself' },
        { from: 'alex', text: 'she\'s so tiny! I can\'t wait to meet her' },
        { from: 'mom', text: 'We\'re going to visit next month. You should come!' },
        { from: 'alex', text: 'I\'d love that' },

        { ts: 'September 10', type: 'header' },
        { from: 'mom', text: 'Come over Sunday? I\'m making your favorite', choice: 'mom1' },

        { ts: 'September 25', type: 'header' },
        { from: 'mom', text: 'We missed you Sunday! Saved you a plate in the fridge' },
        { from: 'mom', text: 'Dad made his famous garlic bread. It wasn\'t as good without you stealing half of it \u{1F602}' },

        { ts: 'October 5', type: 'header' },
        { from: 'mom', text: 'Haven\'t heard from you in a while honey. Everything okay at work?' },
        { from: 'alex', text: 'yeah just really busy' },
        { from: 'mom', text: 'Don\'t forget to eat real food! Not just those energy bars' },
        { from: 'alex', text: 'I know mom' },

        { ts: 'October 20', type: 'header' },
        { from: 'mom', text: 'Saw this recipe and thought of you. It\'s that spicy noodle thing you like' },
        { from: 'mom', text: 'Maybe we can make it together sometime?' },

        { ts: 'November 1', type: 'header' },
        { from: 'mom', text: 'Thanksgiving is coming up. You\'re still coming right?' },
        { from: 'alex', text: 'I\'ll try' },
        { from: 'mom', text: 'You\'ll try? Sweetie it\'s Thanksgiving. Everyone\'s asking about you' },

        { ts: 'November 28', type: 'header' },
        { from: 'mom', text: 'We missed you today. Saved you a plate.' },
        { from: 'mom', text: 'Grandma asked about you three times.' },
        { from: 'mom', text: 'She said to tell you she loves you and that you need to eat more' },

        { ts: 'December 18', type: 'header' },
        { from: 'mom', text: 'Alex please call me back' },
        { from: 'mom', text: 'I\'m worried about you' },
        { from: 'mom', text: 'Dad is too. He won\'t say it but I can tell.' },

        { ts: 'January 5', type: 'header' },
        { from: 'mom', text: 'I talked to Jordan. They\'re worried too.' },
        { from: 'mom', text: 'You don\'t have to talk about anything you don\'t want to. I just want to hear your voice.' },
        { from: 'mom', text: 'Please call.' },

        { ts: 'February 8', type: 'header' },
        { from: 'mom', text: 'I\'m coming over Saturday.' },
        { from: 'mom', text: 'You don\'t have to open the door. I\'ll just sit outside for a bit.' },
        { from: 'mom', text: 'I love you. Nothing will ever change that.' },
        { from: 'mom', text: 'read', type: 'receipt', status: 'unread' },
      ]
    },

    squad: {
      name: 'THE SQUAD \u{1F4AC}',
      avatar: '\u{1F465}',
      color: '#30d158',
      lastSeen: '',
      preview: 'Mika: has anyone heard from Alex?',
      unread: 15,
      isGroup: true,
      members: ['Alex', 'Jordan', 'Mika', 'Sam'],
      messages: [
        { ts: 'July 15', type: 'header' },
        { from: 'mika', text: 'SQUAD ASSEMBLEEEEE \u{1F3AE}' },
        { from: 'sam', text: 'what\'s the plan' },
        { from: 'jordan', text: 'beach day Sunday??' },
        { from: 'alex', text: 'I\'m SO in. I need sun on my face' },
        { from: 'mika', text: 'I\'ll bring the bluetooth speaker' },
        { from: 'sam', text: 'I got snacks' },
        { from: 'alex', text: 'I got the vibes \u2728' },
        { from: 'jordan', text: 'the vibes aren\'t a real contribution Alex' },
        { from: 'alex', text: 'the vibes are ESSENTIAL Jordan' },
        { from: 'mika', text: 'lmaooo I missed us' },

        { ts: 'July 22', type: 'header' },
        { from: 'sam', text: 'that beach day was PERFECT' },
        { from: 'alex', text: 'I am sunburned in places I didn\'t know could burn' },
        { from: 'mika', text: 'that\'s what you get for falling asleep face down' },
        { from: 'jordan', text: 'I have pictures. they\'re leverage now.' },
        { from: 'alex', text: 'DELETE THOSE' },

        { ts: 'August 12', type: 'header' },
        { from: 'mika', text: 'movie marathon at mine this Saturday?' },
        { from: 'sam', text: 'only if we watch the bad ones' },
        { from: 'alex', text: 'bad movies are the ONLY movies' },
        { from: 'jordan', text: 'I\'m bringing the ranking scorecards again' },
        { from: 'mika', text: 'you and your scorecards \u{1F602}' },

        { ts: 'August 20', type: 'header' },
        { from: 'sam', text: 'so who\'s going to mika\'s thing on Saturday' },
        { from: 'jordan', text: 'me obviously' },
        { from: 'alex', text: 'wouldn\'t miss it!' },
        { from: 'mika', text: 'it\'s gonna be legendary' },

        { ts: 'September 30', type: 'header' },
        { from: 'mika', text: 'weekend hangout at mine? games + pizza', choice: 'squad1' },
        { from: 'sam', text: 'yes!' },
        { from: 'jordan', text: 'in' },

        { ts: 'October 12', type: 'header' },
        { from: 'sam', text: 'Alex you alive in there?? \u{1F602}' },
        { from: 'mika', text: 'they haven\'t said anything in like 2 weeks' },
        { from: 'jordan', text: 'they\'ve been busy' },
        { from: 'sam', text: 'too busy for the squad? impossible' },
        { from: 'mika', text: 'Alex if you\'re reading this: we miss your face' },

        { ts: 'October 28', type: 'header' },
        { from: 'sam', text: 'halloween plans??' },
        { from: 'mika', text: 'group costume!! like last year' },
        { from: 'jordan', text: 'Alex?' },
        { from: 'jordan', text: 'they were online 2 hours ago' },
        { from: 'mika', text: '...' },

        { ts: 'November 10', type: 'header' },
        { from: 'alex', text: '', type: 'system', systemText: 'Alex left the group' },
        { from: 'mika', text: 'wait what??' },
        { from: 'sam', text: 'did Alex just leave??' },
        { from: 'jordan', text: 'I\'ll talk to them' },
        { from: 'mika', text: 'is everything okay?' },
        { from: 'jordan', text: 'I don\'t know' },
        { from: 'sam', text: 'should we add them back?' },
        { from: 'jordan', text: 'let me try talking to them first' },

        { ts: 'December 1', type: 'header' },
        { from: 'sam', text: 'has anyone heard from Alex since...' },
        { from: 'mika', text: 'no. I texted them directly. nothing.' },
        { from: 'jordan', text: 'same' },
        { from: 'mika', text: 'should we be worried?' },
        { from: 'jordan', text: 'I think we should be.' },

        { ts: 'January 10', type: 'header' },
        { from: 'sam', text: 'it doesn\'t feel right doing stuff without Alex' },
        { from: 'mika', text: 'I know' },
        { from: 'jordan', text: 'I know' },

        { ts: 'January 20', type: 'header' },
        { from: 'mika', text: 'I keep thinking about when we all went to the beach' },
        { from: 'mika', text: 'Alex was so happy that day' },
        { from: 'sam', text: 'yeah...' },
        { from: 'jordan', text: 'they were' },
        { from: 'mika', text: 'has anyone heard from Alex?' },
      ]
    },

    taylor: {
      name: 'Taylor',
      avatar: 'T',
      color: '#ff9f0a',
      lastSeen: 'last seen 6 weeks ago',
      preview: 'My door\'s always open.',
      unread: 3,
      messages: [
        { ts: 'August 5', type: 'header' },
        { from: 'taylor', text: 'Hey! It was so nice meeting you at Mika\'s party' },
        { from: 'alex', text: 'same!! you\'re so easy to talk to' },
        { from: 'taylor', text: 'right?? we talked for like 2 hours' },
        { from: 'alex', text: 'I feel like we\'ve known each other forever haha' },
        { from: 'taylor', text: 'coffee this week? I know a great place' },
        { from: 'alex', text: 'absolutely! Thursday?' },
        { from: 'taylor', text: 'perfect \u2615' },

        { ts: 'August 10', type: 'header' },
        { from: 'taylor', text: 'that was SO fun! the barista remembered your ridiculous order' },
        { from: 'alex', text: 'it\'s not ridiculous, it\'s SPECIFIC' },
        { from: 'taylor', text: 'oat milk lavender latte with two pumps of vanilla and a shot of espresso on the side' },
        { from: 'alex', text: '...okay when you say it like that' },
        { from: 'taylor', text: '\u{1F602}\u{1F602}\u{1F602}' },

        { ts: 'August 25', type: 'header' },
        { from: 'taylor', text: 'that coffee shop was SO good. we need to go back' },
        { from: 'alex', text: 'agreed. the oat milk latte changed my life' },
        { from: 'taylor', text: 'we should try the one on 5th street too. I heard their pastries are insane' },
        { from: 'alex', text: 'a coffee crawl? I\'m in' },

        { ts: 'September 18', type: 'header' },
        { from: 'taylor', text: 'coffee again? same place?', choice: 'taylor1' },

        { ts: 'October 8', type: 'header' },
        { from: 'taylor', text: 'hey no worries about cancelling. rain check anytime!' },
        { from: 'alex', text: 'thanks for understanding' },
        { from: 'taylor', text: 'of course! just let me know when you\'re free' },

        { ts: 'November 2', type: 'header' },
        { from: 'taylor', text: 'I went to the coffee place and got your ridiculous order in your honor' },
        { from: 'taylor', text: 'it was actually really good. you have taste, I\'ll give you that' },

        { ts: 'November 15', type: 'header' },
        { from: 'taylor', text: 'hey! thinking of you. hope you\'re doing well \u{1F49B}' },

        { ts: 'December 22', type: 'header' },
        { from: 'taylor', text: 'merry christmas Alex! no pressure to reply' },
        { from: 'taylor', text: 'just wanted you to know I think about our coffee hangs' },
        { from: 'taylor', text: 'my door\'s always open.' },
        { from: 'taylor', text: 'read', type: 'receipt', status: 'unread' },
      ]
    },

    notes: {
      name: 'Notes to Self',
      avatar: '\u{1F4DD}',
      color: '#ffd60a',
      lastSeen: '',
      preview: 'If anyone finds this phone\u2014',
      unread: 1,
      isNotes: true,
      entries: [
        {
          title: 'Summer Goals!! \u{1F31E}',
          date: 'July 1',
          content: '\u2022 Learn to cook 3 new recipes\n\u2022 Go hiking at least twice a month\n\u2022 Read 2 books\n\u2022 Be a better friend\n\u2022 Start that project I keep talking about\n\u2022 Say yes to things more often\n\nThis is going to be the best summer.',
          mood: 'happy'
        },
        {
          title: 'Things I\'m grateful for',
          date: 'July 20',
          content: '\u2022 Jordan \u2014 always knows how to make me laugh\n\u2022 Mom\'s cooking (and patience)\n\u2022 The squad\n\u2022 That new friend Taylor \u2014 feels like a good one\n\u2022 Summer evenings\n\u2022 The fact that I can start over any time I want',
          mood: 'happy'
        },
        {
          title: 'Good day',
          date: 'August 15',
          content: 'Went to the beach with everyone today. Sam fell asleep and got the worst tan lines. Jordan made us all do a ranking of the clouds.\n\nI laughed so hard my stomach hurt.\n\nI want to remember this feeling.',
          mood: 'happy'
        },
        {
          title: 'Summer Goals (updated)',
          date: 'September 1',
          content: '<span class="crossed">\u2022 Learn to cook 3 new recipes</span>\n<span class="crossed">\u2022 Go hiking at least twice a month</span>\n\u2022 Read 2 books\n<span class="crossed">\u2022 Be a better friend</span>\n<span class="crossed">\u2022 Start that project I keep talking about</span>\n<span class="crossed">\u2022 Say yes to things more often</span>\n\n...maybe next month',
          mood: 'declining'
        },
        {
          title: 'Unsent message to Jordan',
          date: 'October 28',
          content: '<div class="unsent">I don\'t know how to explain it. It\'s not that I don\'t care. I care so much it hurts. I just can\'t seem to\n\nI don\'t know why I can\'t just\n\nYou deserve better than</div>\n\n[draft deleted]',
          mood: 'sad'
        },
        {
          title: 'Why',
          date: 'November 20',
          content: 'Why is it so hard to do the simplest things\n\nI used to be someone who showed up\n\nNow I can\'t even reply to a text\n\nI opened Jordan\'s message today. Read the whole thing. My thumb hovered over the keyboard for ten minutes.\n\nNothing came out.',
          mood: 'sad'
        },
        {
          title: 'The people I\'m letting down',
          date: 'December 5',
          content: 'Jordan\nMom\nMika\nSam\nTaylor\nGrandma\n\n...me',
          mood: 'sad'
        },
        {
          title: '',
          date: 'December 15',
          content: 'tired',
          mood: 'numb'
        },
        {
          title: 'If anyone finds this phone\u2014',
          date: 'February 14',
          content: 'If anyone finds this phone\u2014\n\nI want you to know that the people in these messages are the best people I\'ve ever known. They tried. They really tried.\n\nI just couldn\'t\n\n<span class="incomplete">|</span>',
          mood: 'final',
          choice: 'notes1'
        }
      ]
    }
  };

  /* ── Choice definitions ── */
  const CHOICES = {
    jordan1: {
      prompt: 'Alex stares at the message. What runs through their mind?',
      options: [
        { label: '"No. You\'re the only thing that\'s right."', tone: 'tender', thought: 'Alex\'s eyes sting. They type "no" and delete it three times.' },
        { label: '"I wish it were that simple."', tone: 'sad', thought: 'Alex sets the phone face-down on the table and stares at the ceiling for a long time.' },
        { label: '...', tone: 'numb', thought: 'Alex reads the message. Reads it again. Locks the phone.' }
      ]
    },
    jordan2: {
      prompt: 'Jordan\'s words hang in the air. Alex...',
      options: [
        { label: 'Starts typing. Stops. Types again. Deletes everything.', tone: 'avoidant', thought: '"I want to let you in. I just forgot where I put the door."' },
        { label: 'Just stares at the screen until it goes dark.', tone: 'numb', thought: 'The screen times out. Alex doesn\'t turn it back on.' }
      ]
    },
    mom1: {
      prompt: 'Mom wants Alex to come home.',
      options: [
        { label: '"Yes!! I\'ll be there \u{1F60A}" (Alex never goes)', tone: 'avoidant', thought: 'Alex types the message with full intention of going. Sunday comes and goes.' },
        { label: '"Maybe, I\'ll let you know"', tone: 'honest', thought: 'Alex means it as a yes. But "maybe" becomes their most honest word.' },
        { label: 'Leave it on read', tone: 'numb', thought: 'Alex sees the message. The thought of the house, the smells, the warmth \u2014 it\'s too much.' }
      ]
    },
    squad1: {
      prompt: 'The squad wants Alex there. Alex wants to be there too. But...',
      options: [
        { label: '"YESSS count me in!! \u{1F389}" (Alex cancels day-of)', tone: 'avoidant', thought: 'Saturday morning. Alex is dressed. Standing by the door. They text "sorry something came up" and go back to bed.' },
        { label: '"honestly not feeling great, you guys go ahead"', tone: 'honest', thought: 'It\'s the most honest thing Alex has said in weeks. No one knows how much it cost to send.' },
        { label: 'Don\'t reply', tone: 'numb', thought: 'The notification badge sits there for three days before Alex clears it without reading.' }
      ]
    },
    taylor1: {
      prompt: 'A new friend reaching out. Simple. Easy. But nothing feels simple anymore.',
      options: [
        { label: '"Sure! How about Thursday?" (cancels Wednesday night)', tone: 'avoidant', thought: 'Alex genuinely wants to go. That\'s what makes the cancellation text so hard to send.' },
        { label: '"I appreciate it but I\'m not up for it lately"', tone: 'honest', thought: 'Taylor\'s kindness makes this harder, not easier.' },
        { label: 'Read. No reply.', tone: 'numb', thought: 'Another person to disappoint. The list keeps growing.' }
      ]
    },
    notes1: {
      prompt: 'The final entry is incomplete. What does the silence mean to you?',
      options: [
        { label: 'A pause. Not an ending. Alex will finish this sentence someday.', tone: 'tender', thought: null },
        { label: 'A goodbye they couldn\'t finish writing.', tone: 'sad', thought: null },
        { label: 'That\'s not for us to decide.', tone: 'honest', thought: null }
      ]
    }
  };

  const CHOICE_COUNT = 6;

  /* Emotional weight multipliers for scoring */
  const MSG_WEIGHTS = {
    jordan: 1.5,
    mom: 1.3,
    squad: 1.0,
    taylor: 0.8
  };

  /* ── Compute actual message counts from data (exclude headers/system markers) ── */
  function countRealMessages(contact) {
    if (!contact.messages) return 0;
    return contact.messages.filter(m => m.type !== 'header').length;
  }

  const MSG_COUNTS = {};
  ['jordan', 'mom', 'squad', 'taylor'].forEach(k => {
    MSG_COUNTS[k] = countRealMessages(CONTACTS[k]);
  });
  const NOTE_COUNT = CONTACTS.notes.entries.length;

  /* ──────────────────────────────────────────────────────────── *
   *  STATE                                                       *
   * ──────────────────────────────────────────────────────────── */

  const SAVE_KEY = 'lastSeenOnlineState';

  const defaultState = () => ({
    started: false,
    unlocked: false,
    currentScreen: 'lock',
    currentContact: null,
    messagesRevealed: { jordan: 0, mom: 0, squad: 0, taylor: 0 },
    choicesMade: {},
    totalMessagesRead: 0,
    contactsOpened: [],
    contactsFullyRead: [],
    notesRead: [],
    completionPercent: 0,
    endingReached: false,
    tones: []
  });

  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved) return { ...defaultState(), ...saved };
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  function saveState() {
    state.completionPercent = calcCompletion();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function calcCompletion() {
    let score = 0;

    // Messages: 50 points (weighted)
    const totalWeightedMsgs = Object.entries(MSG_COUNTS).reduce((s, [k, v]) => s + v * (MSG_WEIGHTS[k] || 1), 0);
    const readWeightedMsgs = Object.entries(state.messagesRevealed).reduce((s, [k, v]) => {
      const count = Math.min(v, MSG_COUNTS[k] || 0);
      return s + count * (MSG_WEIGHTS[k] || 1);
    }, 0);
    if (totalWeightedMsgs > 0) score += (readWeightedMsgs / totalWeightedMsgs) * 50;

    // Notes: 15 points
    score += (state.notesRead.length / NOTE_COUNT) * 15;

    // Choices: 15 points
    score += (Object.keys(state.choicesMade).length / CHOICE_COUNT) * 15;

    // Contacts fully read: 10 points (2 each for 5 contacts including notes)
    score += state.contactsFullyRead.length * 2;

    // Ending: 10 points
    if (state.endingReached) score += 10;

    return Math.min(100, Math.round(score));
  }

  /* ──────────────────────────────────────────────────────────── *
   *  ACHIEVEMENTS                                                *
   * ──────────────────────────────────────────────────────────── */

  const ACHIEVEMENTS = [
    { id: 'lso_inbox',       icon: '\u{1F4F1}', name: 'Inbox Zero',      desc: 'Open first conversation' },
    { id: 'lso_connections', icon: '\u{1F465}', name: 'Connections',      desc: 'Read all 5 contacts' },
    { id: 'lso_shoes',       icon: '\u{1F45F}', name: 'In Their Shoes',   desc: 'Make all 6 choices' },
    { id: 'lso_diary',       icon: '\u{1F4DD}', name: 'Dear Diary',       desc: 'Read all notes' },
    { id: 'lso_lastseen',    icon: '\u{1F494}', name: 'Last Seen',        desc: 'Reach the ending' },
    { id: 'lso_everyword',   icon: '\u2728',    name: 'Every Word',       desc: '100% completion' }
  ];

  function checkAchievements() {
    const earned = [];
    if (state.contactsOpened.length >= 1) earned.push('lso_inbox');
    if (state.contactsOpened.length >= 5) earned.push('lso_connections');
    if (Object.keys(state.choicesMade).length >= CHOICE_COUNT) earned.push('lso_shoes');
    if (state.notesRead.length >= NOTE_COUNT) earned.push('lso_diary');
    if (state.endingReached) earned.push('lso_lastseen');
    if (state.completionPercent >= 100) earned.push('lso_everyword');

    const prev = JSON.parse(localStorage.getItem('lso_achievements') || '[]');
    const newOnes = earned.filter(id => !prev.includes(id));
    if (newOnes.length) {
      localStorage.setItem('lso_achievements', JSON.stringify([...new Set([...prev, ...earned])]));
      newOnes.forEach(id => {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) showAchievementToast(ach);
      });
    }
  }

  function showAchievementToast(ach) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(30,30,50,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:12px 16px;display:flex;gap:10px;align-items:center;z-index:9999;animation:bubbleIn 0.3s ease;font-size:13px;color:#f0f0f5;backdrop-filter:blur(12px);';
    toast.innerHTML = '<span style="font-size:24px">' + ach.icon + '</span><div><strong>' + ach.name + '</strong><br><span style="color:#8e8e93">' + ach.desc + '</span></div>';
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 3500);
  }

  /* ──────────────────────────────────────────────────────────── *
   *  DOM REFS                                                    *
   * ──────────────────────────────────────────────────────────── */

  const $ = function(id) { return document.getElementById(id); };
  const lockScreen = $('lockScreen');
  const homeScreen = $('homeScreen');
  const chatScreen = $('chatScreen');
  const notesScreen = $('notesScreen');
  const noteDetailEl = $('noteDetail');
  const endingScreen = $('endingScreen');
  const choiceOverlay = $('choiceOverlay');
  const choicePrompt = $('choicePrompt');
  const choiceOptions = $('choiceOptions');
  const thoughtBubble = $('thoughtBubble');
  const thoughtText = $('thoughtText');
  const chatMessages = $('chatMessages');
  const contactList = $('contactList');
  const notesList = $('notesList');

  /* ──────────────────────────────────────────────────────────── *
   *  SCREEN MANAGEMENT                                           *
   * ──────────────────────────────────────────────────────────── */

  const screens = { lock: lockScreen, home: homeScreen, chat: chatScreen, notes: notesScreen, noteDetail: noteDetailEl, ending: endingScreen };

  function showScreen(name, opts) {
    opts = opts || {};
    var prev = screens[state.currentScreen];
    var next = screens[name];
    if (!next) return;

    // Hide choice overlay when switching screens
    choiceOverlay.classList.remove('visible');
    thoughtBubble.classList.remove('visible');

    Object.keys(screens).forEach(function(k) {
      var s = screens[k];
      s.classList.remove('active', 'slide-in', 'slide-out');
      if (s !== prev && s !== next) s.style.display = 'none';
    });

    if (opts.slide && prev && prev !== next) {
      prev.classList.add('slide-out');
      next.style.display = 'flex';
      next.classList.add('slide-in');
      setTimeout(function() {
        prev.classList.remove('slide-out');
        prev.style.display = 'none';
        next.classList.remove('slide-in');
        next.classList.add('active');
      }, 300);
    } else {
      if (prev) { prev.classList.remove('active'); prev.style.display = 'none'; }
      next.style.display = 'flex';
      next.classList.add('active');
    }

    state.currentScreen = name;
    saveState();
  }

  /* ──────────────────────────────────────────────────────────── *
   *  LOCK SCREEN                                                 *
   * ──────────────────────────────────────────────────────────── */

  function initLockScreen() {
    // Show notification previews
    var notifs = $('lockNotifications');
    notifs.innerHTML = '';
    var previews = [
      { name: 'Jordan', color: '#5856d6', text: 'I just need to know you\'re okay.', letter: 'J' },
      { name: 'Mom', color: '#ff6b6b', text: 'I\'m coming over Saturday.', letter: 'M' },
      { name: 'THE SQUAD', color: '#30d158', text: 'has anyone heard from Alex?', letter: 'S' },
    ];
    previews.forEach(function(p) {
      var el = document.createElement('div');
      el.className = 'lock-notif';
      el.innerHTML = '<div class="lock-notif-avatar" style="background:' + p.color + '">' + p.letter + '</div>' +
        '<div class="lock-notif-text"><strong>' + p.name + '</strong><span>' + p.text + '</span></div>';
      notifs.appendChild(el);
    });

    // Support both click and swipe up
    var startY = 0;
    lockScreen.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
    }, { passive: true });
    lockScreen.addEventListener('touchend', function(e) {
      var endY = e.changedTouches[0].clientY;
      if (startY - endY > 50) unlock(); // swipe up
    });
    lockScreen.addEventListener('click', unlock);
  }

  function unlock() {
    if (state.unlocked) return;
    state.unlocked = true;
    state.started = true;
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.unlock();
    saveState();
    renderContactList();
    showScreen('home', { slide: true });
  }

  /* ──────────────────────────────────────────────────────────── *
   *  CONTACT LIST                                                *
   * ──────────────────────────────────────────────────────────── */

  function renderContactList() {
    contactList.innerHTML = '';
    var order = ['jordan', 'mom', 'squad', 'taylor', 'notes'];
    order.forEach(function(key) {
      var c = CONTACTS[key];
      var fullyRead = state.contactsFullyRead.indexOf(key) !== -1;
      var el = document.createElement('div');
      el.className = 'contact-item';

      // Compute remaining unread
      var remaining;
      if (c.isNotes) {
        remaining = Math.max(0, c.entries.length - state.notesRead.length);
      } else {
        remaining = Math.max(0, MSG_COUNTS[key] - (state.messagesRevealed[key] || 0));
      }
      var showBadge = !fullyRead && remaining > 0;

      // Timestamp display
      var timeText = '';
      if (!c.isNotes && !c.isGroup) {
        timeText = c.lastSeen ? c.lastSeen.replace('last seen ', '') : '';
      }

      el.innerHTML =
        '<div class="contact-avatar" style="background:' + c.color + '">' + c.avatar + '</div>' +
        '<div class="contact-info">' +
          '<div class="contact-name">' + c.name + '</div>' +
          '<div class="contact-preview">' + c.preview + '</div>' +
        '</div>' +
        '<div class="contact-meta">' +
          '<div class="contact-time">' + timeText + '</div>' +
          '<div class="contact-badge ' + (showBadge ? '' : 'hidden') + '">' + (showBadge ? remaining : '') + '</div>' +
          '<div class="contact-check ' + (fullyRead ? '' : 'hidden') + '">\u2713</div>' +
        '</div>';
      el.addEventListener('click', function() { openContact(key); });
      contactList.appendChild(el);
    });
  }

  /* ──────────────────────────────────────────────────────────── *
   *  OPEN CONTACT                                                *
   * ──────────────────────────────────────────────────────────── */

  function openContact(key) {
    if (state.contactsOpened.indexOf(key) === -1) {
      state.contactsOpened.push(key);
      saveState();
      checkAchievements();
    }

    state.currentContact = key;
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.openChat();

    if (CONTACTS[key].isNotes) {
      renderNotesList();
      showScreen('notes', { slide: true });
    } else {
      renderChat(key);
      showScreen('chat', { slide: true });
    }
  }

  /* ──────────────────────────────────────────────────────────── *
   *  CHAT VIEW                                                   *
   * ──────────────────────────────────────────────────────────── */

  var revealTimeout = null;
  var isRevealing = false;
  var currentRevealKey = null;

  function renderChat(key) {
    var c = CONTACTS[key];
    $('chatAvatar').style.background = c.color;
    $('chatAvatar').textContent = c.avatar;
    $('chatName').textContent = c.name;
    $('chatLastSeen').textContent = c.lastSeen;
    chatMessages.innerHTML = '';

    // Show already-revealed messages instantly
    var revealed = state.messagesRevealed[key] || 0;
    var msgs = c.messages;
    var realMsgIndex = 0;
    var resumeFrom = -1;

    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m.type === 'header') {
        // Only show header if there are revealed messages after it
        // (or if we haven't reached the reveal point yet)
        appendTimestamp(m.ts);
        continue;
      }
      if (realMsgIndex < revealed) {
        appendMessage(m, key, false);
        realMsgIndex++;
      } else {
        // Start revealing from this index
        resumeFrom = i;
        break;
      }
    }

    if (resumeFrom >= 0) {
      startRevealing(key, resumeFrom);
    } else {
      // All messages already revealed
      markContactFullyRead(key);
    }
  }

  function startRevealing(key, fromIndex) {
    if (isRevealing) return;
    isRevealing = true;
    currentRevealKey = key;
    revealNext(key, CONTACTS[key].messages, fromIndex);
  }

  function revealNext(key, msgs, idx) {
    if (idx >= msgs.length) {
      isRevealing = false;
      currentRevealKey = null;
      markContactFullyRead(key);
      checkEndingCondition();
      return;
    }

    // Stop if we navigated away
    if (state.currentScreen !== 'chat' || state.currentContact !== key) {
      isRevealing = false;
      currentRevealKey = null;
      return;
    }

    var m = msgs[idx];

    if (m.type === 'header') {
      appendTimestamp(m.ts);
      revealNext(key, msgs, idx + 1);
      return;
    }

    // Determine pacing based on progress
    var progress = (state.messagesRevealed[key] || 0) / (MSG_COUNTS[key] || 30);
    var delay;
    if (progress < 0.3) delay = 200;
    else if (progress < 0.5) delay = 400;
    else if (progress < 0.7) delay = 600;
    else delay = 1000;

    // Check for choice trigger
    if (m.choice && !state.choicesMade[m.choice]) {
      appendMessage(m, key, true);
      state.messagesRevealed[key] = (state.messagesRevealed[key] || 0) + 1;
      state.totalMessagesRead++;
      saveState();
      isRevealing = false;
      currentRevealKey = null;
      // Show choice after message appears
      setTimeout(function() { showChoice(m.choice, key, idx + 1); }, 800);
      return;
    }

    // Show typing indicator for incoming messages
    if (m.from !== 'alex') {
      showTypingIndicator();
      revealTimeout = setTimeout(function() {
        removeTypingIndicator();
        appendMessage(m, key, true);
        state.messagesRevealed[key] = (state.messagesRevealed[key] || 0) + 1;
        state.totalMessagesRead++;
        saveState();
        revealTimeout = setTimeout(function() { revealNext(key, msgs, idx + 1); }, delay);
      }, 600);
    } else {
      appendMessage(m, key, true);
      state.messagesRevealed[key] = (state.messagesRevealed[key] || 0) + 1;
      state.totalMessagesRead++;
      saveState();
      revealTimeout = setTimeout(function() { revealNext(key, msgs, idx + 1); }, delay);
    }
  }

  function appendTimestamp(ts) {
    var el = document.createElement('div');
    el.className = 'msg-timestamp-header';
    el.textContent = ts;
    chatMessages.appendChild(el);
    scrollChat();
  }

  function appendMessage(m, contactKey, animate) {
    if (m.type === 'receipt') {
      var el = document.createElement('div');
      el.className = m.status === 'unread' ? 'msg-delivered' : 'msg-read';
      el.textContent = m.status === 'unread' ? 'Delivered' : 'Read \u2713\u2713';
      chatMessages.appendChild(el);
      scrollChat();
      return;
    }

    if (m.type === 'system' || m.systemText) {
      var el2 = document.createElement('div');
      el2.className = 'msg-system';
      el2.textContent = m.systemText || m.text;
      chatMessages.appendChild(el2);
      scrollChat();
      return;
    }

    var el3 = document.createElement('div');
    var isAlex = m.from === 'alex';
    el3.className = 'msg ' + (isAlex ? 'msg-out' : 'msg-in');

    // For group chat, show sender name
    if (CONTACTS[contactKey] && CONTACTS[contactKey].isGroup && !isAlex) {
      var senderColors = { jordan: '#5856d6', mika: '#ff9f0a', sam: '#30d158', mom: '#ff6b6b', taylor: '#ff9f0a' };
      var nameSpan = document.createElement('div');
      nameSpan.style.cssText = 'font-size:11px;font-weight:600;margin-bottom:2px;color:' + (senderColors[m.from] || '#8e8e93');
      nameSpan.textContent = m.from.charAt(0).toUpperCase() + m.from.slice(1);
      el3.appendChild(nameSpan);
    }

    var textNode = document.createTextNode(m.text);
    el3.appendChild(textNode);

    if (!animate) el3.style.animation = 'none';
    chatMessages.appendChild(el3);

    if (animate && typeof Audio_LSO !== 'undefined') {
      if (isAlex) Audio_LSO.messageOut();
      else Audio_LSO.messageIn();
    }

    scrollChat();
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    var el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'typingDots';
    el.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(el);
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.typing();
    scrollChat();
  }

  function removeTypingIndicator() {
    var el = $('typingDots');
    if (el) el.remove();
  }

  function scrollChat() {
    requestAnimationFrame(function() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function markContactFullyRead(key) {
    if (state.contactsFullyRead.indexOf(key) === -1) {
      state.contactsFullyRead.push(key);
      saveState();
      checkAchievements();
    }
  }

  /* ──────────────────────────────────────────────────────────── *
   *  CHOICES                                                     *
   * ──────────────────────────────────────────────────────────── */

  function showChoice(choiceId, contactKey, nextIdx) {
    var choice = CHOICES[choiceId];
    if (!choice) return;

    if (typeof Audio_LSO !== 'undefined') Audio_LSO.choiceAppear();

    choicePrompt.textContent = choice.prompt;
    choiceOptions.innerHTML = '';
    choice.options.forEach(function(opt, i) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', function() { selectChoice(choiceId, i, contactKey, nextIdx); });
      choiceOptions.appendChild(btn);
    });
    choiceOverlay.classList.add('visible');
  }

  function selectChoice(choiceId, optIndex, contactKey, nextIdx) {
    var choice = CHOICES[choiceId];
    var opt = choice.options[optIndex];

    if (typeof Audio_LSO !== 'undefined') Audio_LSO.choiceSelect();

    state.choicesMade[choiceId] = { option: optIndex, tone: opt.tone };
    state.tones.push(opt.tone);
    saveState();
    checkAchievements();

    choiceOverlay.classList.remove('visible');

    // Show thought bubble if applicable
    if (opt.thought) {
      thoughtText.textContent = opt.thought;
      thoughtBubble.classList.add('visible');
      setTimeout(function() {
        thoughtBubble.classList.remove('visible');
        // Continue revealing after thought fades
        setTimeout(function() {
          isRevealing = false;
          currentRevealKey = null;
          startRevealing(contactKey, nextIdx);
        }, 400);
      }, 4000);
    } else {
      // Continue revealing
      setTimeout(function() {
        isRevealing = false;
        currentRevealKey = null;
        startRevealing(contactKey, nextIdx);
      }, 600);
    }
  }

  /* ──────────────────────────────────────────────────────────── *
   *  NOTES SCREEN                                                *
   * ──────────────────────────────────────────────────────────── */

  function renderNotesList() {
    notesList.innerHTML = '';
    var entries = CONTACTS.notes.entries;
    entries.forEach(function(entry, i) {
      var el = document.createElement('div');
      el.className = 'note-item';
      var isRead = state.notesRead.indexOf(i) !== -1;
      var plainText = entry.content.replace(/<[^>]+>/g, '').substring(0, 60);
      el.innerHTML =
        '<div class="note-title" style="' + (isRead ? 'opacity:0.6' : '') + '">' + (entry.title || '(untitled)') + '</div>' +
        '<div class="note-preview">' + plainText + '...</div>' +
        '<div class="note-date">' + entry.date + '</div>';
      el.addEventListener('click', function() { openNote(i); });
      notesList.appendChild(el);
    });
  }

  function openNote(index) {
    var entry = CONTACTS.notes.entries[index];
    $('noteDetailTitle').textContent = entry.title || '(untitled)';
    $('noteDetailContent').innerHTML = entry.content;

    if (state.notesRead.indexOf(index) === -1) {
      state.notesRead.push(index);
      saveState();
      checkAchievements();
    }

    // Check if all notes are now read
    if (state.notesRead.length >= NOTE_COUNT) {
      markContactFullyRead('notes');
    }

    // Check for choice on this note
    if (entry.choice && !state.choicesMade[entry.choice]) {
      setTimeout(function() { showNoteChoice(entry.choice); }, 2000);
    }

    showScreen('noteDetail', { slide: true });
    checkEndingCondition();
  }

  function showNoteChoice(choiceId) {
    var choice = CHOICES[choiceId];
    if (!choice) return;

    if (typeof Audio_LSO !== 'undefined') Audio_LSO.choiceAppear();

    choicePrompt.textContent = choice.prompt;
    choiceOptions.innerHTML = '';
    choice.options.forEach(function(opt, i) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', function() {
        state.choicesMade[choiceId] = { option: i, tone: opt.tone };
        state.tones.push(opt.tone);
        saveState();
        checkAchievements();
        choiceOverlay.classList.remove('visible');
        if (typeof Audio_LSO !== 'undefined') Audio_LSO.choiceSelect();

        // Show thought if present
        if (opt.thought) {
          thoughtText.textContent = opt.thought;
          thoughtBubble.classList.add('visible');
          setTimeout(function() {
            thoughtBubble.classList.remove('visible');
          }, 3500);
        }

        checkEndingCondition();
      });
      choiceOptions.appendChild(btn);
    });
    choiceOverlay.classList.add('visible');
  }

  /* ──────────────────────────────────────────────────────────── *
   *  BACK NAVIGATION                                             *
   * ──────────────────────────────────────────────────────────── */

  $('chatBack').addEventListener('click', function() {
    clearTimeout(revealTimeout);
    isRevealing = false;
    currentRevealKey = null;
    removeTypingIndicator();
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.back();
    renderContactList();
    showScreen('home');
    checkEndingCondition();
  });

  $('notesBack').addEventListener('click', function() {
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.back();
    renderContactList();
    showScreen('home');
    checkEndingCondition();
  });

  $('noteDetailBack').addEventListener('click', function() {
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.back();
    renderNotesList();
    showScreen('notes');
  });

  /* ──────────────────────────────────────────────────────────── *
   *  ENDING SEQUENCE                                             *
   * ──────────────────────────────────────────────────────────── */

  function checkEndingCondition() {
    if (state.endingReached) return;
    var completion = calcCompletion();
    // Trigger ending at ~80% completion or when all contacts fully read
    if (completion >= 75 || state.contactsFullyRead.length >= 5) {
      triggerEnding();
    }
  }

  function triggerEnding() {
    if (state.endingReached) return;
    state.endingReached = true;
    saveState();

    // Stop any ongoing reveals
    clearTimeout(revealTimeout);
    isRevealing = false;
    currentRevealKey = null;

    // Brief pause before transition
    setTimeout(function() {
      showScreen('ending');

      // Stop ambient tension for silence
      if (typeof Audio_LSO !== 'undefined') Audio_LSO.ambientTension(0);

      // After notification appears (2s CSS delay), play sound
      setTimeout(function() {
        if (typeof Audio_LSO !== 'undefined') Audio_LSO.notification();
      }, 2200);

      // Fade to title card
      setTimeout(function() {
        $('endingFade').classList.add('visible');

        var finalCompletion = calcCompletion();
        var subtitle = getEndingSubtitle();
        $('endingSubtitle').textContent = subtitle;
        $('endingScore').textContent = finalCompletion + '% of Alex\'s story discovered';

        // Arcade integration
        if (typeof Arcade !== 'undefined') {
          Arcade.onGameOver('last-seen-online', finalCompletion);
          var best = parseInt(localStorage.getItem('lastSeenOnlineBest') || '0');
          if (finalCompletion > best) {
            localStorage.setItem('lastSeenOnlineBest', String(finalCompletion));
          }
        }

        checkAchievements();
      }, 5500);
    }, 800);
  }

  function getEndingSubtitle() {
    // Determine dominant tone from choices
    var toneCounts = {};
    (state.tones || []).forEach(function(t) { toneCounts[t] = (toneCounts[t] || 0) + 1; });
    var entries = Object.entries(toneCounts);
    entries.sort(function(a, b) { return b[1] - a[1]; });
    var tone = entries.length > 0 ? entries[0][0] : 'honest';

    var subtitles = {
      tender: 'The people who love us don\'t stop. Even when we go quiet.',
      sad: 'Some silences are louder than anything we could ever say.',
      numb: 'Not every disappearance makes the news.',
      honest: 'Check in on someone today.',
      avoidant: 'The hardest door to open is the one you closed yourself.'
    };
    return subtitles[tone] || subtitles.honest;
  }

  $('endingBtn').addEventListener('click', function() {
    window.location.href = '/';
  });

  $('replayBtn').addEventListener('click', function() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('lso_achievements');
    state = defaultState();
    location.reload();
  });

  /* ──────────────────────────────────────────────────────────── *
   *  MUTE BUTTON                                                 *
   * ──────────────────────────────────────────────────────────── */

  var muteBtn = $('muteBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', function() {
      if (typeof Audio_LSO !== 'undefined') {
        var muted = Audio_LSO.toggleMute();
        muteBtn.textContent = muted ? '\u{1F507}' : '\u{1F50A}';
        muteBtn.title = muted ? 'Unmute' : 'Mute';
      }
    });
  }

  /* ──────────────────────────────────────────────────────────── *
   *  AMBIENT TENSION                                             *
   * ──────────────────────────────────────────────────────────── */

  function updateAmbientTension() {
    if (typeof Audio_LSO === 'undefined') return;
    if (state.endingReached) return;
    var completion = calcCompletion();
    var level = Math.min(1, completion / 80);
    Audio_LSO.ambientTension(level);
  }

  /* ──────────────────────────────────────────────────────────── *
   *  INIT                                                        *
   * ──────────────────────────────────────────────────────────── */

  function init() {
    if (state.endingReached) {
      // Show ending screen directly
      showScreen('ending');
      $('endingFade').classList.add('visible');
      $('endingSubtitle').textContent = getEndingSubtitle();
      $('endingScore').textContent = (state.completionPercent || calcCompletion()) + '% of Alex\'s story discovered';
      return;
    }

    if (state.unlocked) {
      renderContactList();
      showScreen('home');
    } else {
      initLockScreen();
      showScreen('lock');
    }

    // Ambient tension update interval
    setInterval(updateAmbientTension, 5000);
  }

  // Arcade restart support
  document.addEventListener('arcade-restart', function() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('lso_achievements');
    state = defaultState();
    location.reload();
  });

  init();

})();
