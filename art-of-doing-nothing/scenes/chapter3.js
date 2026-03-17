/* ═══════════════════════════════════════════════════════════════
   chapter3.js  –  "The Scroll Hole"
   Theme: Digital distraction | Setting: Sam's desk, night
   Color: Screen cyan #0A2A2A
   ═══════════════════════════════════════════════════════════════ */
window.Chapter3 = `

# start
n: Wednesday night. 8 PM.
n: Sam sits at the desk. Laptop open. Thesis document glaring back.
n: The cursor blinks like a heartbeat.
(...800)
n: The phone sits next to the laptop. Face up. Glowing.
s: Before we start — and we ARE going to start — just check one thing real quick.
s: It'll take two seconds. Then we focus. I promise.
[Ignore the phone, start writing](#resist_phone)
[Quick check, then focus](#check_phone)
[Move the phone to another room](#hide_phone)

# resist_phone
\`GameState.adjustMeter(-10)\`
m: No. I know how this goes. "Two seconds" becomes two hours.
s: That's offensive. I would never— okay, I would. But THIS time is different.
n: Sam pushes the phone aside. Opens the thesis doc.
n: The blank page stares. Sam stares back.
(...600)
s: You know, staring at a blank page is also technically not working.
m: I'm thinking.
s: Are you though? Or are you panicking quietly?
[Start with an outline](#write_outline)
[Type anything, even garbage](#write_garbage)

# write_outline
\`GameState.adjustMeter(-5)\`
n: Sam types: "I. Introduction. II. Literature Review. III..."
s: Wow. Roman numerals. Very fancy. Very empty.
m: It's structure. Structure helps.
n: The outline takes shape. Each section heading is like a small lighthouse.
n: It's not writing, but it's the scaffolding for writing.
s: You're basically procrastinating in an organized way.
m: I'll take organized procrastination over chaos.
s: Fair enough.
(#writing_flow)

# write_garbage
\`GameState.adjustMeter(-5); _.wroteGarbage = true\`
n: Sam starts typing: "This thesis is about how I don't want to write this thesis."
s: That's... not academic.
m: It's words. That's step one. Fix it later.
n: The dam breaks. Sam types whatever comes out. Stream of consciousness.
n: Half of it is nonsense. But buried in the nonsense are real ideas.
s: I can't tell if this is genius or a breakdown.
m: Why not both?
(#writing_flow)

# writing_flow
n: Something shifts. The words come easier now.
n: Not good words. Not thesis words. But words.
(...600)
n: The phone lights up. A notification. Sam's eyes dart to it.
s: One look. Just to know what it is. Then right back.
[Stay focused](#stay_focused)
[Just a glance...](#glance_phone)

# stay_focused
\`GameState.adjustMeter(-10)\`
n: Sam takes a breath and looks back at the screen.
m: Not now.
s: You're really going to just... ignore it?
m: I know that if I look, I won't come back for an hour.
s: That's a gross exaggeration. Forty-five minutes, tops.
n: The notification light blinks. Sam types through it.
n: By 10 PM, the thesis has two full pages.
s: Okay, I'm... I'm actually kind of impressed.
s: This is deeply unsettling behavior and I don't know what to do with it.
m: You could try being supportive.
s: That's not in my job description. But... good work. I guess.
\`_.ch3_ending = 'discipline'\`
\`GameState.adjustMeter(-10)\`
(#chapter_end)

# glance_phone
\`GameState.adjustMeter(10)\`
n: Just a glance. Sam picks up the phone.
n: It's a like on an old post. Nothing important.
s: While you're here, check the feed. Just the top. Three posts.
[Put it down](#put_down)
[Okay, just three posts](#three_posts)

# put_down
\`GameState.adjustMeter(-5)\`
n: Sam puts the phone down. Returns to the thesis.
s: Wow. Willpower. Rare commodity these days.
n: The writing continues. Slower now — the momentum broke — but it continues.
n: By 11 PM, Sam has a page and a half. Not great. But something.
s: You know, you could have had a much more relaxing evening.
m: But I'd have nothing to show for it.
s: Nothing is underrated.
\`_.ch3_ending = 'balance'\`
(#chapter_end)

# three_posts
\`GameState.adjustMeter(15)\`
n: Three posts. Then three more. Then a video.
n: The video has a sequel. The sequel has a Part 3.
s: This is research. Cultural literacy. Essential for a well-rounded thesis.
n: 9:15 PM. The thesis hasn't moved.
(...600)
s: Okay, here's what we do. We watch one more thing and THEN we work.
m: You said that thirty minutes ago.
s: I say a lot of things. This time I mean it.
[Keep scrolling, you're in too deep](#deep_scroll)
[Force yourself to stop](#force_stop)

# check_phone
\`GameState.adjustMeter(10)\`
n: Sam picks up the phone. Just a quick check.
n: Three notifications. A meme from Alex.
{{if _.ignoredAlex}}
n: Under it, a text: "Haven't heard from you. Hope you're doing okay."
m: ...
s: That's nice of them. You can reply tomorrow.
{{/if}}
s: While the phone's already out — did you see what's trending?
[Put the phone down, start working](#resist_phone)
[Check trending for just a minute](#trending)

# trending
\`GameState.adjustMeter(15)\`
s: Oh wow, look at this. Did you see this? This is IMPORTANT.
n: It's a video of someone teaching their cat to high-five.
m: This isn't important.
s: It's emotionally important. Joy is important, Sam.
n: One video leads to another. The algorithm is precise and merciless.
n: It knows exactly what Sam will click. It was built to know.
s: Okay, one more and then— oh wait, this one has a dog in it too.
(#scroll_spiral)

# scroll_spiral
\`GameState.adjustMeter(10)\`
n: 9:30 PM. An hour has evaporated.
n: Sam's thumb moves on its own. Scroll. Scroll. Like. Scroll.
m: I should stop.
s: You should. But you won't. Because stopping requires effort and scrolling requires nothing.
s: That's the beauty of it. Zero friction. Pure comfort.
m: This isn't comfort. This is numbness.
s: ...what's the difference?
[Keep going, you're numb and it's fine](#deep_scroll)
[Stop. Right now.](#force_stop)

# deep_scroll
\`GameState.adjustMeter(15); _.deepScrolled = true\`
n: 10:45 PM. Sam hasn't moved in two hours.
n: The room is dark except for the phone glow.
n: Sam's eyes are dry. The thumb keeps scrolling.
s: ...Sam?
m: ...
s: Hey. Sam. You in there?
m: I can't stop.
s: Sure you can. You just—
m: No. I literally can't. I know I should stop and I can't make my hand stop.
(...1000)
s: ...oh.
s: That's... that's not comfort anymore, is it?
m: It hasn't been comfort for a while.
n: Sam puts the phone face-down. The screen goes dark.
n: In the silence, the thesis document still glows on the laptop.
n: The cursor still blinks. Patient. Waiting.
m: I lost the whole night.
s: ...yeah.
s: I'm sorry, Sam. I thought I was helping.
m: I know.
\`_.ch3_ending = 'lost'\`
(#chapter_end)

# force_stop
\`GameState.adjustMeter(-5)\`
n: Sam puts the phone in a drawer. Physically. Out of reach.
s: That's dramatic. It's not a weapon.
m: For me it kind of is.
n: Sam sits back at the desk. The thesis doc is still there.
n: The writing is hard now. The brain is scattered.
n: But Sam types. One sentence. Then another.
n: By midnight, there's a page. Rough, broken, but real.
s: You made it harder than it needed to be.
m: Maybe. But I made it.
\`_.ch3_ending = 'recovery'\`
\`GameState.adjustMeter(-10)\`
(#chapter_end)

# hide_phone
\`GameState.adjustMeter(-15); _.hidPhone = true\`
n: Sam picks up the phone and walks it to the bathroom.
n: Puts it in the medicine cabinet. Closes the mirror.
s: You just put your phone in JAIL. That's excessive.
m: It's self-defense.
s: Against a rectangle? You're fighting a rectangle?
n: Sam sits back at the desk. The silence is almost shocking.
n: No buzzing. No glowing. Just the cursor and the keys.
(...600)
n: And then... Sam writes.
n: Not perfectly. Not brilliantly. But steadily.
n: The words come like water through a crack — slow at first, then faster.
s: ...I don't know what to do with myself when you're actually working.
m: You could be quiet.
s: I don't know how to do that either.
n: By 10:30 PM, Sam has three pages. Three real pages.
s: Okay. I'll say it once: that was impressive.
s: Don't let it go to your head.
\`_.ch3_ending = 'discipline'\`
\`GameState.adjustMeter(-15)\`
(#chapter_end)

# chapter_end
(...1000)
n: End of Chapter 3: The Scroll Hole.
(...600)
{{if _.ch3_ending === 'discipline'}}
s: You beat me tonight. You actually beat me.
s: Enjoy it. It won't last.
s: ...will it?
{{/if}}
{{if _.ch3_ending === 'balance'}}
s: Not perfect, but not bad. You bent without breaking.
s: I can work with that.
{{/if}}
{{if _.ch3_ending === 'recovery'}}
s: You fell in, but you climbed out. That takes something.
s: I'm not sure what. But it takes something.
{{/if}}
{{if _.ch3_ending === 'lost'}}
s: I was supposed to protect you. Make you feel better.
s: But I think... I think I just made it easier to hide.
s: And hiding isn't the same as being safe.
{{/if}}
n: Chapter 3 complete.

`;
