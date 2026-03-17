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
        { from: 'jordan', text: 'bring it 😤' },
        { from: 'alex', text: 'also can we do that ramen place Saturday? I\'ve been thinking about their tonkotsu all week' },
        { from: 'jordan', text: 'yes absolutely. 7pm? I\'ll drive' },
        { from: 'alex', text: 'perfect. you\'re the best' },

        // Month 2 — still good
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
        { from: 'jordan', text: '❤️ okay. take care of yourself' },

        // Month 3-4 — pulling back
        { ts: 'September 5', type: 'header' },
        { from: 'jordan', text: 'movie night Friday?? the whole crew is in' },
        { from: 'alex', text: 'might have to skip this one, sorry. got a thing' },
        { from: 'jordan', text: 'a thing? what thing?' },
        { from: 'alex', text: 'just stuff. next time for sure' },

        { ts: 'September 22', type: 'header' },
        { from: 'jordan', text: 'hey haven\'t seen you in like 2 weeks. everything cool?' },
        { from: 'alex', text: 'yeah just busy' },
        { from: 'jordan', text: 'okay... wanna grab coffee tomorrow? even just 20 min?' },
        { from: 'alex', text: 'maybe' },
        // choice 1 triggers here
        { from: 'jordan', text: 'Did I do something wrong?', choice: 'jordan1' },

        // Month 5-6 — one word replies
        { ts: 'October 15', type: 'header' },
        { from: 'jordan', text: 'Alex. come on. talk to me' },
        { from: 'alex', text: 'sorry' },
        { from: 'jordan', text: 'sorry for WHAT? I don\'t even know what\'s going on' },
        { from: 'jordan', text: 'I sent you that long message last week and you just... read it?' },
        { from: 'alex', text: '✓✓', type: 'system' },

        { ts: 'November 8', type: 'header' },
        { from: 'jordan', text: 'I drove past the ramen place today' },
        { from: 'jordan', text: 'remember when you ate so fast you literally choked and the waiter had to bring you extra water' },
        { from: 'jordan', text: 'I miss that. I miss you.' },
        // choice 2 triggers here
        { from: 'jordan', text: 'I know something is wrong. I can feel it. You don\'t have to explain everything. You don\'t have to be okay. I just want to be there. Please let me be there.', choice: 'jordan2' },

        // Month 7-8 — no response
        { ts: 'December 3', type: 'header' },
        { from: 'jordan', text: 'your birthday is next week' },
        { from: 'jordan', text: 'I got you something stupid. you\'ll hate it. (you\'ll love it)' },

        { ts: 'December 10', type: 'header' },
        { from: 'jordan', text: 'happy birthday Alex' },
        { from: 'jordan', text: 'I left it on your porch. the thing you\'ll hate.' },
        { from: 'jordan', text: 'read', type: 'receipt', status: 'unread' },

        { ts: 'January 14', type: 'header' },
        { from: 'jordan', text: 'saw your light was on last night' },
        { from: 'jordan', text: 'at least I know you\'re there' },

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
        { from: 'mom', text: 'The secret is more garlic than you think is reasonable 😄' },
        { from: 'alex', text: 'noted. love you mom' },
        { from: 'mom', text: 'Love you more! Dad says hi' },

        { ts: 'August 1', type: 'header' },
        { from: 'mom', text: 'Your cousin Sarah had the baby!! 8 lbs 3 oz. Little girl named Lily 🌸' },
        { from: 'alex', text: 'awww!! that\'s amazing. send pics!' },
        { from: 'mom', text: 'Sending a million. Brace yourself' },
        { from: 'alex', text: 'she\'s so tiny! I can\'t wait to meet her' },

        { ts: 'September 10', type: 'header' },
        { from: 'mom', text: 'Come over Sunday? I\'m making your favorite', choice: 'mom1' },

        { ts: 'October 5', type: 'header' },
        { from: 'mom', text: 'Haven\'t heard from you in a while honey. Everything okay at work?' },
        { from: 'alex', text: 'yeah just really busy' },
        { from: 'mom', text: 'Don\'t forget to eat real food! Not just those energy bars' },
        { from: 'alex', text: 'I know mom' },

        { ts: 'November 1', type: 'header' },
        { from: 'mom', text: 'Thanksgiving is coming up. You\'re still coming right?' },
        { from: 'alex', text: 'I\'ll try' },
        { from: 'mom', text: 'You\'ll try? Sweetie it\'s Thanksgiving. Everyone\'s asking about you' },

        { ts: 'November 28', type: 'header' },
        { from: 'mom', text: 'We missed you today. Saved you a plate.' },
        { from: 'mom', text: 'Grandma asked about you three times.' },

        { ts: 'December 18', type: 'header' },
        { from: 'mom', text: 'Alex please call me back' },
        { from: 'mom', text: 'I\'m worried about you' },

        { ts: 'January 5', type: 'header' },
        { from: 'mom', text: 'I talked to Jordan. They\'re worried too.' },
        { from: 'mom', text: 'You don\'t have to talk about anything you don\'t want to. I just want to hear your voice.' },
        { from: 'mom', text: 'Please call.' },

        { ts: 'February 8', type: 'header' },
        { from: 'mom', text: 'I\'m coming over Saturday.' },
        { from: 'mom', text: 'You don\'t have to open the door. I\'ll just sit outside for a bit.' },
        { from: 'mom', text: 'I love you.' },
        { from: 'mom', text: 'read', type: 'receipt', status: 'unread' },
      ]
    },

    squad: {
      name: 'THE SQUAD 💬',
      avatar: '👥',
      color: '#30d158',
      lastSeen: '',
      preview: 'Mika: has anyone heard from Alex?',
      unread: 15,
      isGroup: true,
      members: ['Alex', 'Jordan', 'Mika', 'Sam'],
      messages: [
        { ts: 'July 15', type: 'header' },
        { from: 'mika', text: 'SQUAD ASSEMBLEEEEE 🎮' },
        { from: 'sam', text: 'what\'s the plan' },
        { from: 'jordan', text: 'beach day Sunday??' },
        { from: 'alex', text: 'I\'m SO in. I need sun on my face' },
        { from: 'mika', text: 'I\'ll bring the bluetooth speaker' },
        { from: 'sam', text: 'I got snacks' },
        { from: 'alex', text: 'I got the vibes ✨' },
        { from: 'jordan', text: 'the vibes aren\'t a real contribution Alex' },
        { from: 'alex', text: 'the vibes are ESSENTIAL Jordan' },
        { from: 'mika', text: 'lmaooo I missed us' },

        { ts: 'August 20', type: 'header' },
        { from: 'sam', text: 'so who\'s going to mika\'s thing on Saturday' },
        { from: 'jordan', text: 'me obviously' },
        { from: 'alex', text: 'wouldn\'t miss it!' },
        { from: 'mika', text: 'it\'s gonna be legendary' },

        { ts: 'September 30', type: 'header' },
        { from: 'mika', text: 'weekend hangout at mine? games + pizza', choice: 'squad1' },
        { from: 'sam', text: 'yes!' },
        { from: 'jordan', text: 'in' },

        { ts: 'October 20', type: 'header' },
        { from: 'sam', text: 'Alex you alive in there?? 😂' },
        { from: 'mika', text: 'they haven\'t said anything in like 2 weeks' },
        { from: 'jordan', text: 'they\'ve been busy' },
        { from: 'sam', text: 'too busy for the squad? impossible' },

        { ts: 'November 10', type: 'header' },
        { from: 'alex', text: '', type: 'system', systemText: 'Alex left the group' },
        { from: 'mika', text: 'wait what??' },
        { from: 'sam', text: 'did Alex just leave??' },
        { from: 'jordan', text: 'I\'ll talk to them' },
        { from: 'mika', text: 'is everything okay?' },
        { from: 'jordan', text: 'I don\'t know' },

        { ts: 'December 1', type: 'header' },
        { from: 'sam', text: 'has anyone heard from Alex since...' },
        { from: 'mika', text: 'no. I texted them directly. nothing.' },
        { from: 'jordan', text: 'same' },
        { from: 'mika', text: 'should we be worried?' },
        { from: 'jordan', text: 'I think we should be.' },

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
        { from: 'taylor', text: 'perfect ☕' },

        { ts: 'August 25', type: 'header' },
        { from: 'taylor', text: 'that coffee shop was SO good. we need to go back' },
        { from: 'alex', text: 'agreed. the oat milk latte changed my life' },

        { ts: 'September 18', type: 'header' },
        { from: 'taylor', text: 'coffee again? same place?', choice: 'taylor1' },

        { ts: 'October 8', type: 'header' },
        { from: 'taylor', text: 'hey no worries about cancelling. rain check anytime!' },
        { from: 'alex', text: 'thanks for understanding' },
        { from: 'taylor', text: 'of course! just let me know when you\'re free' },

        { ts: 'November 15', type: 'header' },
        { from: 'taylor', text: 'hey! thinking of you. hope you\'re doing well 💛' },

        { ts: 'December 22', type: 'header' },
        { from: 'taylor', text: 'merry christmas Alex! no pressure to reply' },
        { from: 'taylor', text: 'just wanted you to know I think about our coffee hangs' },
        { from: 'taylor', text: 'my door\'s always open.' },
        { from: 'taylor', text: 'read', type: 'receipt', status: 'unread' },
      ]
    },

    notes: {
      name: 'Notes to Self',
      avatar: '📝',
      color: '#ffd60a',
      lastSeen: '',
      preview: 'If anyone finds this phone—',
      unread: 1,
      isNotes: true,
      entries: [
        {
          title: 'Summer Goals!! 🌞',
          date: 'July 1',
          content: '• Learn to cook 3 new recipes\n• Go hiking at least twice a month\n• Read 2 books\n• Be a better friend\n• Start that project I keep talking about\n• Say yes to things more often',
          mood: 'happy'
        },
        {
          title: 'Things I\'m grateful for',
          date: 'July 20',
          content: '• Jordan — always knows how to make me laugh\n• Mom\'s cooking (and patience)\n• The squad\n• That new friend Taylor — feels like a good one\n• Summer evenings\n• The fact that I can start over any time I want',
          mood: 'happy'
        },
        {
          title: 'Summer Goals (updated)',
          date: 'September 1',
          content: '<span class="crossed">• Learn to cook 3 new recipes</span>\n<span class="crossed">• Go hiking at least twice a month</span>\n• Read 2 books\n<span class="crossed">• Be a better friend</span>\n<span class="crossed">• Start that project I keep talking about</span>\n<span class="crossed">• Say yes to things more often</span>\n\n...maybe next month',
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
          content: 'Why is it so hard to do the simplest things\n\nI used to be someone who showed up\n\nNow I can\'t even reply to a text',
          mood: 'sad'
        },
        {
          title: '',
          date: 'December 15',
          content: 'tired',
          mood: 'numb'
        },
        {
          title: 'The people I\'m letting down',
          date: 'January 8',
          content: 'Jordan\nMom\nMika\nSam\nTaylor\nGrandma\n\n...me',
          mood: 'sad'
        },
        {
          title: 'If anyone finds this phone—',
          date: 'February 14',
          content: 'If anyone finds this phone—\n\nI want you to know that the people in these messages are the best people I\'ve ever known. They tried. They really tried.\n\nI just couldn\'t\n\n<span class="incomplete">|</span>',
          mood: 'final',
          choice: 'notes1'
        }
      ]
    }
  };

  /* ── Choice definitions ── */
  const CHOICES = {
    jordan1: {
      trigger: 'Did I do something wrong?',
      prompt: 'Alex stares at the message. What runs through their mind?',
      options: [
        { label: 'No. You\'re the only thing that\'s right.', tone: 'tender', thought: 'Alex\'s eyes sting. They type "no" and delete it three times.' },
        { label: 'I wish it were that simple.', tone: 'sad', thought: 'Alex sets the phone face-down on the table and stares at the ceiling for a long time.' },
        { label: '...', tone: 'numb', thought: 'Alex reads the message. Reads it again. Locks the phone.' }
      ]
    },
    jordan2: {
      trigger: null,
      prompt: 'Jordan\'s words hang in the air. Alex...',
      options: [
        { label: 'Starts typing. Stops. Types again. Deletes everything.', tone: 'avoidant', thought: '"I want to let you in. I just forgot where I put the door."' },
        { label: 'Just stares at the screen until it goes dark.', tone: 'numb', thought: 'The screen times out. Alex doesn\'t turn it back on.' }
      ]
    },
    mom1: {
      trigger: 'Come over Sunday?',
      prompt: 'Mom wants Alex to come home.',
      options: [
        { label: '"Yes!! I\'ll be there 😊" (Alex never goes)', tone: 'avoidant', thought: 'Alex types the message with full intention. Sunday comes and goes.' },
        { label: '"Maybe, I\'ll let you know"', tone: 'honest', thought: 'Alex means it as a yes. But "maybe" becomes their most honest word.' },
        { label: 'Leave it on read', tone: 'numb', thought: 'Alex sees the message. The thought of the house, the smells, the warmth — it\'s too much.' }
      ]
    },
    squad1: {
      trigger: 'weekend hangout',
      prompt: 'The squad wants Alex there. Alex wants to be there too. But...',
      options: [
        { label: '"YESSS count me in!! 🎉" (Alex cancels day-of)', tone: 'avoidant', thought: 'Saturday morning. Alex is dressed. Standing by the door. They text "sorry something came up" and go back to bed.' },
        { label: '"honestly not feeling great, you guys go ahead"', tone: 'honest', thought: 'It\'s the most honest thing Alex has said in weeks. No one knows how much it cost.' },
        { label: 'Don\'t reply', tone: 'numb', thought: 'The notification badge sits there for three days before Alex clears it without reading.' }
      ]
    },
    taylor1: {
      trigger: 'coffee again?',
      prompt: 'A new friend reaching out. Simple. Easy. But nothing feels simple anymore.',
      options: [
        { label: '"Sure! How about Thursday?" (cancels Wednesday night)', tone: 'avoidant', thought: 'Alex genuinely wants to go. That\'s what makes the cancellation text so hard to send.' },
        { label: '"I appreciate it but I\'m not up for it lately"', tone: 'honest', thought: 'Taylor\'s kindness makes this harder, not easier.' },
        { label: 'Read. No reply.', tone: 'numb', thought: 'Another person to disappoint. The list keeps growing.' }
      ]
    },
    notes1: {
      trigger: null,
      prompt: 'The final entry is incomplete. What does the silence mean to you?',
      options: [
        { label: 'A pause. Not an ending. Alex will finish this sentence someday.', tone: 'tender', thought: null },
        { label: 'A goodbye they couldn\'t finish writing.', tone: 'sad', thought: null },
        { label: 'That\'s not for us to decide.', tone: 'honest', thought: null }
      ]
    }
  };

  /* Message counts for scoring — total messages per contact */
  const MSG_COUNTS = {
    jordan: 47,
    mom: 28,
    squad: 38,
    taylor: 18
  };
  const NOTE_COUNT = 8;
  const CHOICE_COUNT = 6;

  /* Emotional weight multipliers for scoring */
  const MSG_WEIGHTS = {
    jordan: 1.5,
    mom: 1.3,
    squad: 1.0,
    taylor: 0.8
  };

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
    const totalPossible = 100;

    // Messages: 50 points (weighted)
    const totalWeightedMsgs = Object.entries(MSG_COUNTS).reduce((s, [k, v]) => s + v * MSG_WEIGHTS[k], 0);
    const readWeightedMsgs = Object.entries(state.messagesRevealed).reduce((s, [k, v]) => {
      const count = Math.min(v, MSG_COUNTS[k] || 0);
      return s + count * (MSG_WEIGHTS[k] || 1);
    }, 0);
    score += (readWeightedMsgs / totalWeightedMsgs) * 50;

    // Notes: 15 points
    score += (state.notesRead.length / NOTE_COUNT) * 15;

    // Choices: 15 points
    score += (Object.keys(state.choicesMade).length / CHOICE_COUNT) * 15;

    // Contacts fully read: 10 points (2 each)
    score += state.contactsFullyRead.length * 2;

    // Ending: 10 points
    if (state.endingReached) score += 10;

    return Math.min(100, Math.round(score));
  }

  /* ──────────────────────────────────────────────────────────── *
   *  ACHIEVEMENTS                                                *
   * ──────────────────────────────────────────────────────────── */

  const ACHIEVEMENTS = [
    { id: 'lso_inbox',       icon: '📱', name: 'Inbox Zero',      desc: 'Open first conversation' },
    { id: 'lso_connections', icon: '👥', name: 'Connections',      desc: 'Read all 5 contacts' },
    { id: 'lso_shoes',       icon: '👟', name: 'In Their Shoes',   desc: 'Make all 6 choices' },
    { id: 'lso_diary',       icon: '📝', name: 'Dear Diary',       desc: 'Read all notes' },
    { id: 'lso_lastseen',    icon: '💔', name: 'Last Seen',        desc: 'Reach the ending' },
    { id: 'lso_everyword',   icon: '✨', name: 'Every Word',       desc: '100% completion' }
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
    toast.innerHTML = `<span style="font-size:24px">${ach.icon}</span><div><strong>${ach.name}</strong><br><span style="color:#8e8e93">${ach.desc}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 3500);
  }

  /* ──────────────────────────────────────────────────────────── *
   *  DOM REFS                                                    *
   * ──────────────────────────────────────────────────────────── */

  const $ = id => document.getElementById(id);
  const lockScreen = $('lockScreen');
  const homeScreen = $('homeScreen');
  const chatScreen = $('chatScreen');
  const notesScreen = $('notesScreen');
  const noteDetail = $('noteDetail');
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

  const screens = { lock: lockScreen, home: homeScreen, chat: chatScreen, notes: notesScreen, noteDetail, ending: endingScreen };

  function showScreen(name, opts = {}) {
    const prev = screens[state.currentScreen];
    const next = screens[name];
    if (!next) return;

    Object.values(screens).forEach(s => {
      s.classList.remove('active', 'slide-in', 'slide-out');
      if (s !== prev && s !== next) s.style.display = 'none';
    });

    if (opts.slide) {
      prev.classList.add('slide-out');
      next.style.display = 'flex';
      next.classList.add('slide-in');
      setTimeout(() => {
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
    const notifs = $('lockNotifications');
    notifs.innerHTML = '';
    const previews = [
      { name: 'Jordan', color: '#5856d6', text: 'I just need to know you\'re okay.', count: '12' },
      { name: 'Mom', color: '#ff6b6b', text: 'I\'m coming over Saturday.', count: '8' },
      { name: 'THE SQUAD', color: '#30d158', text: 'has anyone heard from Alex?', count: '15' },
    ];
    previews.forEach(p => {
      const el = document.createElement('div');
      el.className = 'lock-notif';
      el.innerHTML = `<div class="lock-notif-avatar" style="background:${p.color}">${p.name[0]}</div>
        <div class="lock-notif-text"><strong>${p.name}</strong><span>${p.text}</span></div>`;
      notifs.appendChild(el);
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
    const order = ['jordan', 'mom', 'squad', 'taylor', 'notes'];
    order.forEach(key => {
      const c = CONTACTS[key];
      const fullyRead = state.contactsFullyRead.includes(key);
      const el = document.createElement('div');
      el.className = 'contact-item';
      const unreadCount = c.isNotes
        ? Math.max(0, c.entries.length - state.notesRead.length)
        : Math.max(0, (c.messages ? c.messages.filter(m => m.type !== 'header').length : 0) - (state.messagesRevealed[key] || 0));
      const showBadge = !fullyRead && unreadCount > 0;

      el.innerHTML = `
        <div class="contact-avatar" style="background:${c.color}">${c.avatar}</div>
        <div class="contact-info">
          <div class="contact-name">${c.name}</div>
          <div class="contact-preview">${c.preview}</div>
        </div>
        <div class="contact-meta">
          <div class="contact-time">${c.isNotes ? '' : c.lastSeen ? c.lastSeen.replace('last seen ', '') : ''}</div>
          <div class="contact-badge ${showBadge ? '' : 'hidden'}">${showBadge ? (c.unread || unreadCount) : ''}</div>
          <div class="contact-check ${fullyRead ? '' : 'hidden'}">✓</div>
        </div>`;
      el.addEventListener('click', () => openContact(key));
      contactList.appendChild(el);
    });
  }

  /* ──────────────────────────────────────────────────────────── *
   *  OPEN CONTACT                                                *
   * ──────────────────────────────────────────────────────────── */

  function openContact(key) {
    if (!state.contactsOpened.includes(key)) {
      state.contactsOpened.push(key);
      saveState();
      checkAchievements();
    }

    state.currentContact = key;
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.openChat();

    if (CONTACTS[key].isNotes) {
      renderNotesList(key);
      showScreen('notes', { slide: true });
    } else {
      renderChat(key);
      showScreen('chat', { slide: true });
    }
  }

  /* ──────────────────────────────────────────────────────────── *
   *  CHAT VIEW                                                   *
   * ──────────────────────────────────────────────────────────── */

  let revealTimeout = null;
  let revealIndex = 0;
  let isRevealing = false;

  function renderChat(key) {
    const c = CONTACTS[key];
    $('chatAvatar').style.background = c.color;
    $('chatAvatar').textContent = c.avatar;
    $('chatName').textContent = c.name;
    $('chatLastSeen').textContent = c.lastSeen;
    chatMessages.innerHTML = '';

    // Show already-revealed messages instantly
    const revealed = state.messagesRevealed[key] || 0;
    const msgs = c.messages;
    let realMsgIndex = 0;

    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (m.type === 'header') {
        appendTimestamp(m.ts);
        continue;
      }
      if (realMsgIndex < revealed) {
        appendMessage(m, key, false);
        realMsgIndex++;
      } else {
        // Start revealing from here
        revealIndex = i;
        startRevealing(key);
        return;
      }
    }

    // All messages already revealed
    markContactFullyRead(key);
  }

  function startRevealing(key) {
    if (isRevealing) return;
    isRevealing = true;
    const msgs = CONTACTS[key].messages;
    revealNext(key, msgs);
  }

  function revealNext(key, msgs) {
    if (revealIndex >= msgs.length) {
      isRevealing = false;
      markContactFullyRead(key);
      checkEndingCondition();
      return;
    }

    const m = msgs[revealIndex];
    revealIndex++;

    if (m.type === 'header') {
      appendTimestamp(m.ts);
      revealNext(key, msgs);
      return;
    }

    // Determine pacing
    const progress = (state.messagesRevealed[key] || 0) / (MSG_COUNTS[key] || 30);
    let delay;
    if (progress < 0.3) delay = 200;
    else if (progress < 0.6) delay = 450;
    else delay = 900;

    // Check for choice trigger
    if (m.choice && !state.choicesMade[m.choice]) {
      appendMessage(m, key, true);
      state.messagesRevealed[key] = (state.messagesRevealed[key] || 0) + 1;
      state.totalMessagesRead++;
      saveState();
      isRevealing = false;
      // Show choice after message appears
      setTimeout(() => showChoice(m.choice, key, msgs), 800);
      return;
    }

    // Show typing indicator for incoming messages
    if (m.from !== 'alex') {
      showTypingIndicator();
      revealTimeout = setTimeout(() => {
        removeTypingIndicator();
        appendMessage(m, key, true);
        state.messagesRevealed[key] = (state.messagesRevealed[key] || 0) + 1;
        state.totalMessagesRead++;
        saveState();
        revealTimeout = setTimeout(() => revealNext(key, msgs), delay);
      }, 600);
    } else {
      appendMessage(m, key, true);
      state.messagesRevealed[key] = (state.messagesRevealed[key] || 0) + 1;
      state.totalMessagesRead++;
      saveState();
      revealTimeout = setTimeout(() => revealNext(key, msgs), delay);
    }
  }

  function appendTimestamp(ts) {
    const el = document.createElement('div');
    el.className = 'msg-timestamp-header';
    el.textContent = ts;
    chatMessages.appendChild(el);
    scrollChat();
  }

  function appendMessage(m, contactKey, animate) {
    if (m.type === 'receipt') {
      const el = document.createElement('div');
      el.className = m.status === 'unread' ? 'msg-delivered' : 'msg-read';
      el.textContent = m.status === 'unread' ? 'Delivered' : 'Read ✓✓';
      chatMessages.appendChild(el);
      scrollChat();
      return;
    }

    if (m.type === 'system' || m.systemText) {
      const el = document.createElement('div');
      el.className = 'msg-system';
      el.textContent = m.systemText || m.text;
      chatMessages.appendChild(el);
      scrollChat();
      return;
    }

    const el = document.createElement('div');
    const isAlex = m.from === 'alex';
    el.className = `msg ${isAlex ? 'msg-out' : 'msg-in'}`;

    // For group chat, show sender name
    if (CONTACTS[contactKey].isGroup && !isAlex) {
      const nameSpan = document.createElement('div');
      nameSpan.style.cssText = 'font-size:11px;font-weight:600;margin-bottom:2px;color:' +
        ({ jordan: '#5856d6', mika: '#ff9f0a', sam: '#30d158', mom: '#ff6b6b', taylor: '#ff9f0a' }[m.from] || '#8e8e93');
      nameSpan.textContent = m.from.charAt(0).toUpperCase() + m.from.slice(1);
      el.appendChild(nameSpan);
    }

    const textNode = document.createTextNode(m.text);
    el.appendChild(textNode);

    if (!animate) el.style.animation = 'none';
    chatMessages.appendChild(el);

    if (animate) {
      if (typeof Audio_LSO !== 'undefined') {
        if (isAlex) Audio_LSO.messageOut();
        else Audio_LSO.messageIn();
      }
    }

    scrollChat();
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    const el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'typingDots';
    el.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(el);
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.typing();
    scrollChat();
  }

  function removeTypingIndicator() {
    const el = $('typingDots');
    if (el) el.remove();
  }

  function scrollChat() {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function markContactFullyRead(key) {
    if (!state.contactsFullyRead.includes(key)) {
      state.contactsFullyRead.push(key);
      saveState();
      checkAchievements();
    }
  }

  /* ──────────────────────────────────────────────────────────── *
   *  CHOICES                                                     *
   * ──────────────────────────────────────────────────────────── */

  function showChoice(choiceId, contactKey, msgs) {
    const choice = CHOICES[choiceId];
    if (!choice) return;

    if (typeof Audio_LSO !== 'undefined') Audio_LSO.choiceAppear();

    choicePrompt.textContent = choice.prompt;
    choiceOptions.innerHTML = '';
    choice.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => selectChoice(choiceId, i, contactKey, msgs));
      choiceOptions.appendChild(btn);
    });
    choiceOverlay.classList.add('visible');
  }

  function selectChoice(choiceId, optIndex, contactKey, msgs) {
    const choice = CHOICES[choiceId];
    const opt = choice.options[optIndex];

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
      setTimeout(() => {
        thoughtBubble.classList.remove('visible');
        // Continue revealing
        setTimeout(() => {
          isRevealing = false;
          startRevealing(contactKey);
        }, 400);
      }, 4000);
    } else {
      // Continue revealing
      setTimeout(() => {
        isRevealing = false;
        startRevealing(contactKey);
      }, 600);
    }
  }

  /* ──────────────────────────────────────────────────────────── *
   *  NOTES SCREEN                                                *
   * ──────────────────────────────────────────────────────────── */

  function renderNotesList() {
    notesList.innerHTML = '';
    const entries = CONTACTS.notes.entries;
    entries.forEach((entry, i) => {
      const el = document.createElement('div');
      el.className = 'note-item';
      el.innerHTML = `
        <div class="note-title">${entry.title || '(untitled)'}</div>
        <div class="note-preview">${entry.content.replace(/<[^>]+>/g, '').substring(0, 60)}...</div>
        <div class="note-date">${entry.date}</div>`;
      el.addEventListener('click', () => openNote(i));
      notesList.appendChild(el);
    });
  }

  function openNote(index) {
    const entry = CONTACTS.notes.entries[index];
    $('noteDetailTitle').textContent = entry.title || '(untitled)';
    $('noteDetailContent').innerHTML = entry.content;

    if (!state.notesRead.includes(index)) {
      state.notesRead.push(index);
      saveState();
      checkAchievements();
    }

    // Check for choice on this note
    if (entry.choice && !state.choicesMade[entry.choice]) {
      setTimeout(() => showNoteChoice(entry.choice), 2000);
    }

    showScreen('noteDetail', { slide: true });
    checkEndingCondition();
  }

  function showNoteChoice(choiceId) {
    const choice = CHOICES[choiceId];
    if (!choice) return;

    if (typeof Audio_LSO !== 'undefined') Audio_LSO.choiceAppear();

    choicePrompt.textContent = choice.prompt;
    choiceOptions.innerHTML = '';
    choice.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        state.choicesMade[choiceId] = { option: i, tone: opt.tone };
        state.tones.push(opt.tone);
        saveState();
        checkAchievements();
        choiceOverlay.classList.remove('visible');
        if (typeof Audio_LSO !== 'undefined') Audio_LSO.choiceSelect();
        checkEndingCondition();
      });
      choiceOptions.appendChild(btn);
    });
    choiceOverlay.classList.add('visible');
  }

  /* ──────────────────────────────────────────────────────────── *
   *  BACK NAVIGATION                                             *
   * ──────────────────────────────────────────────────────────── */

  $('chatBack').addEventListener('click', () => {
    clearTimeout(revealTimeout);
    isRevealing = false;
    removeTypingIndicator();
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.back();
    renderContactList();
    showScreen('home');
    checkEndingCondition();
  });

  $('notesBack').addEventListener('click', () => {
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.back();
    renderContactList();
    showScreen('home');
    checkEndingCondition();
  });

  $('noteDetailBack').addEventListener('click', () => {
    if (typeof Audio_LSO !== 'undefined') Audio_LSO.back();
    renderNotesList();
    showScreen('notes');
  });

  /* ──────────────────────────────────────────────────────────── *
   *  ENDING SEQUENCE                                             *
   * ──────────────────────────────────────────────────────────── */

  function checkEndingCondition() {
    if (state.endingReached) return;
    const completion = calcCompletion();
    // Trigger ending at ~80% or if all contacts fully read
    if (completion >= 72 || state.contactsFullyRead.length >= 5) {
      triggerEnding();
    }
  }

  function triggerEnding() {
    if (state.endingReached) return;
    state.endingReached = true;
    saveState();

    // Brief pause before transition
    setTimeout(() => {
      showScreen('ending');
      if (typeof Audio_LSO !== 'undefined') Audio_LSO.ambientTension(0);

      // After notification appears (2s delay in CSS), wait, then fade
      setTimeout(() => {
        if (typeof Audio_LSO !== 'undefined') Audio_LSO.notification();
      }, 2000);

      setTimeout(() => {
        $('endingFade').classList.add('visible');
        const finalCompletion = calcCompletion();
        const subtitle = getEndingSubtitle();
        $('endingSubtitle').textContent = subtitle;
        $('endingScore').textContent = `${finalCompletion}% of Alex's story discovered`;

        // Arcade integration
        if (typeof Arcade !== 'undefined') {
          Arcade.onGameOver('last-seen-online', finalCompletion);
          const best = parseInt(localStorage.getItem('lastSeenOnlineBest') || '0');
          if (finalCompletion > best) {
            localStorage.setItem('lastSeenOnlineBest', finalCompletion);
          }
        }

        checkAchievements();
      }, 5500);
    }, 800);
  }

  function getEndingSubtitle() {
    // Determine dominant tone from choices
    const toneCounts = {};
    state.tones.forEach(t => { toneCounts[t] = (toneCounts[t] || 0) + 1; });
    const dominant = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0];
    const tone = dominant ? dominant[0] : 'honest';

    const subtitles = {
      tender: 'The people who love us don\'t stop. Even when we go quiet.',
      sad: 'Some silences are louder than anything we could ever say.',
      numb: 'Not every disappearance makes the news.',
      honest: 'Check in on someone today.',
      avoidant: 'The hardest door to open is the one you closed yourself.'
    };
    return subtitles[tone] || subtitles.honest;
  }

  $('endingBtn').addEventListener('click', () => {
    window.location.href = '/';
  });

  /* ──────────────────────────────────────────────────────────── *
   *  AMBIENT TENSION                                             *
   * ──────────────────────────────────────────────────────────── */

  function updateAmbientTension() {
    if (typeof Audio_LSO === 'undefined') return;
    const completion = calcCompletion();
    const level = Math.min(1, completion / 80);
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
      $('endingScore').textContent = `${state.completionPercent}% of Alex's story discovered`;
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
  document.addEventListener('arcade-restart', () => {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('lso_achievements');
    state = defaultState();
    location.reload();
  });

  init();

})();
