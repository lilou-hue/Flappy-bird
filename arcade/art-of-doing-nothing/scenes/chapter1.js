/* ═══════════════════════════════════════════════════════════════
   chapter1.js  –  "Just Five More Minutes"
   The Art of Doing Nothing
   ═══════════════════════════════════════════════════════════════ */
window.Chapter1 = `

# start
n: The alarm goes off. 6:45 AM. Monday.
n: A beam of pale light slips through the curtain.
n: Under a mountain of blankets, something stirs.
(...800)
n: That something is Sam. And Sam does not want to get up.
(...600)
n: But there's a voice in Sam's head. A warm, slow, familiar voice...
s: Heyyyy. Don't move. You're so warm right now.
s: The bed is perfect. The world outside is cold and full of responsibilities.
s: You've got options. What do you say?
[Hit snooze](#snooze)
[Check your phone first](#phone)
[Just get up](#getup)

# snooze
\`_.snoozed = true; _.snoozeCount++; GameState.adjustMeter(10)\`
s: Excellent choice. Five more minutes never hurt anyone.
n: Sam's hand finds the snooze button with practiced precision.
n: The alarm dies. Sweet silence.
(...1200)
n: Five minutes pass. The alarm screams again.
s: Okay, here's the thing... five MORE minutes.
s: You'll definitely get up after that. Pinky promise.
[Hit snooze again](#snooze_again)
[Fine, get up...](#getup_groggy)

# snooze_again
\`_.snoozeCount++; GameState.adjustMeter(10)\`
{{if _.snoozeCount >= 2}}
n: The snooze button clicks. Again.
s: This is the life. No rush. No stress.
(...800)
(#snooze_late)
{{/if}}
n: Five more minutes. The warmth envelops Sam again.
s: See? This is nice. This is what life should be.
[One more snooze...](#snooze_again)
[Okay, really getting up now](#getup_groggy)

# snooze_late
n: 7:32 AM. Sam's eyes snap open.
n: Class starts in 28 minutes.
m: Oh no. Oh no oh no oh no.
s: Hey hey hey, don't panic. We can work with this.
s: Quick question though — how badly do you want breakfast?
[Skip everything, just GO](#late_rush)
[Turn off the alarm entirely... just rest](#alarm_off)

# late_rush
\`GameState.adjustMeter(20)\`
n: Sam tumbles out of bed like a human avalanche.
s: This is fine. Speed is just... efficient morning living.
n: Clothes from the floor. Good enough.
[Skip breakfast, just leave](#skip_breakfast)
[Grab a granola bar on the way](#grab_something)

# skip_breakfast
s: Food is overrated before noon anyway. That's science.
n: Sam sprints out the door, one shoe untied.
n: The morning air hits like a slap.
m: I'm going to be so late...
s: Late is relative. You're early for tomorrow.
(#leave_late)

# grab_something
n: Sam snatches a granola bar from the counter.
s: See? Multitasking. You're basically a CEO.
n: Bag, keys, phone — the emergency morning trinity.
(#leave_late)

# leave_late
n: Sam makes it to campus with seconds to spare. Barely.
s: And you didn't even die. I call that a win.
n: The morning was chaos. But Sam survived.
s: Surviving is an underrated achievement, honestly.
\`_.ch1_ending = 'comfort'\`
(#chapter_end)

# alarm_off
\`GameState.adjustMeter(25)\`
s: You know what? You deserve rest. Real rest.
n: Sam turns off the alarm completely and pulls the blanket overhead.
(...1500)
n: The room goes dark. Warm. Perfect.
(#oversleep)

# oversleep
n: ...
n: Sam wakes up to sunlight flooding the room.
n: It's 10:47 AM. Class started three hours ago.
m: ...
m: What have I done?
s: Okay. Before you spiral — you needed that sleep.
s: Your body was telling you something. Listen to your body.
m: My body is telling me I'm going to fail this semester.
s: That's your anxiety talking. I'm the chill voice, remember?
(#wake_crisis)

# wake_crisis
n: Sam stares at the ceiling for a full minute.
m: I have three assignments due this week.
s: And this week has, like, five more days. That's tons of time.
n: Sam finally sits up. The weight of the morning settles in.
\`_.ch1_ending = 'stress'\`
(#bathroom_mirror)

# phone
\`_.checkedPhone = true; GameState.adjustMeter(5)\`
n: Sam's hand slides under the pillow. Finds the phone. Instinct.
s: Just a quick check. See what you missed while you were sleeping.
n: The screen glows. 14 notifications. 3 texts. An email from a professor.
s: Ooh, start with the fun stuff. Those texts can wait.
[Scroll social media for a bit](#scroll_deep)
[Just check the time and get up](#check_time)
[Read the texts and get up](#getup_groggy)

# scroll_deep
\`GameState.adjustMeter(15); _.scrolledDeep = true\`
s: Oh, look at that. A video of a cat falling off a table.
n: Sam watches. Then watches the next one. And the next.
s: This is important research. Cultural awareness.
n: The algorithm knows exactly what Sam wants. An endless stream of warm, fuzzy nothing.
(...1000)
s: One more. This one has a dog in it.
[Keep scrolling...](#scroll_deeper)
[Wait — what time is it?](#realize_time)

# scroll_deeper
\`GameState.adjustMeter(10)\`
n: Twenty minutes vanish like a magic trick.
s: Time is a social construct anyway.
n: Sam's thumb moves on autopilot. Scroll. Like. Scroll. Scroll.
s: See? You're relaxed. You're at peace. This is—
m: ...is it really 7:20?
(#realize_time)

# realize_time
n: Sam glances at the clock. The numbers burn.
m: How has it been THIRTY MINUTES?!
s: Time flies when you're vibing.
m: I'm not vibing! I'm going to be late!
s: Are you late, or is the class just early?
\`_.ch1_ending = 'comfort'\`
(#getup_panic)

# check_time
n: 6:47 AM. Still okay. Still time.
s: See? Plenty of time. Maybe even time for another quick—
m: Nope. Getting up.
(#getup_groggy)

# getup
\`_.gotUpFirst = true\`
n: Sam swings both legs out of bed in one decisive motion.
s: Whoa whoa whoa. What are you doing?
s: The bed is RIGHT THERE. It's warm. It loves you.
m: I have things to do today.
s: So does tomorrow. And tomorrow's much better at things.
n: But Sam is already standing. The cold floor sends a shiver up.
(#getup_clean)

# getup_groggy
n: Sam groans and rolls sideways out of bed.
n: One foot on the floor. Then the other. Gravity wins.
s: This is a mistake and I want that on record.
(#bathroom_mirror)

# getup_panic
n: Sam launches out of bed like the mattress is on fire.
s: Okay THIS energy is unnecessary.
(#bathroom_mirror)

# getup_clean
n: Sam stretches. The morning feels manageable, for once.
s: I'm not happy about this. Just so you know.
(#bathroom_mirror)

# bathroom_mirror
n: The bathroom mirror reflects a face that isn't quite awake yet.
(...800)
n: And then Sam sees... something. Behind those tired eyes.
n: A shape. A feeling. Something that's always been there.
(...600)
s: Hey there.
s: I'm your inner sloth.
s: Don't freak out — I've been here your whole life.
s: I'm the voice that says "five more minutes." The one that says "you deserve a break."
s: I'm not lazy. I'm... protective. I keep you comfortable.
m: Am I losing my mind?
s: Nah. You're just finally listening.
s: Now — about that shower situation.
[Skip the shower, save time](#skip_shower)
[Take a shower, you need it](#take_shower)

# skip_shower
\`GameState.adjustMeter(5)\`
s: Smart. Showers are just standing in rain you pay for.
n: Dry shampoo. Deodorant. The college survival kit.
(#breakfast)

# take_shower
n: Hot water. Steam. Five minutes of pretending the world doesn't exist.
s: Okay fine, this is nice. I'll allow it.
n: Sam emerges feeling approximately 23% more human.
(#breakfast)

# breakfast
n: The kitchen counter holds the usual suspects: cereal, a bruised banana, cold coffee from yesterday.
s: Cold coffee still has caffeine. That's just efficiency.
n: Sam pours a bowl and sits down.
n: The phone buzzes. A text from Alex:
n: "Study group at 4 today? Library?"
s: Ugh, a study group. That's just homework with an audience.
(...600)
n: Sam also notices the to-do list stuck to the fridge.
n: Written in Sam's own handwriting, three weeks ago:
n: "1. Finish psych reading. 2. Start English essay. 3. THESIS OUTLINE — due Thursday."
m: Thursday. That's...
s: A whole three days away. An eternity!
n: The sloth grins. The meter pulses.
s: So? What's it going to be?

[Start on the thesis outline now](#start_now)
[You have until Thursday, relax](#later)
[Oh god, the thesis](#panic)

# start_now
n: Sam opens the laptop. The thesis document stares back — blank, except for a name and date.
m: Okay. Let's do this.
s: Wait, really? Right now? Before you've even digested?
m: If I start now, I won't have to panic later.
s: ...I don't understand that logic, but okay.
n: Sam types the first sentence. Then a second. Then a third.
s: Huh. That actually... wasn't terrible.
n: The sloth watches, surprised.
s: I mean, you could still take a break. But... not bad, kid. Not bad.
\`_.ch1_ending = 'productive'\`
\`GameState.adjustMeter(-20)\`
(#chapter_end)

# later
\`GameState.adjustMeter(15)\`
n: Sam closes the laptop. Not today.
s: Three whole days. That's like... 72 hours. Thousands of minutes!
s: Future Sam is going to CRUSH that thesis. Future Sam is a genius.
m: You keep saying that about Future Sam.
s: Because it's true! Future Sam has all the motivation. Present Sam has cereal.
n: The morning settles into a comfortable haze.
n: Nothing was accomplished. Nothing was harmed.
s: And that, my friend, is the art of doing nothing.
\`_.ch1_ending = 'comfort'\`
(#chapter_end)

# panic
\`GameState.adjustMeter(15)\`
m: The thesis. THE THESIS.
m: I haven't even started and it's due in three days.
s: Okay, I hear you panicking, and I need you to stop.
s: Panicking burns calories and those belong to the cereal.
m: This isn't funny! I'm going to fail!
s: You're not going to fail. You're going to... figure it out.
s: You always do. Remember that essay last month? Started at midnight, got a B+.
m: That's not a healthy pattern!
s: Healthy is subjective. You survived. That's the metric.
n: Sam's leg bounces under the table. The anxiety is real.
n: But so is the paralysis. The more Sam thinks about the thesis, the harder it is to start.
s: See? Thinking about it makes it worse. Just... don't think about it. For now.
\`_.ch1_ending = 'stress'\`
(#chapter_end)

# chapter_end
(...1000)
n: End of Chapter 1: Just Five More Minutes.
(...600)
{{if _.ch1_ending === 'productive'}}
s: You actually got stuff done. I'm impressed. And a little offended.
s: But hey... maybe there's something to this "doing things" approach.
{{/if}}
{{if _.ch1_ending === 'comfort'}}
s: See? Nothing went wrong. Everything's fine.
s: ...right?
{{/if}}
{{if _.ch1_ending === 'stress'}}
s: Hey. It's going to be okay.
s: I know I joke around, but... I'm here because you're scared. And that's okay.
{{/if}}
n: Chapter 1 complete.

`;
