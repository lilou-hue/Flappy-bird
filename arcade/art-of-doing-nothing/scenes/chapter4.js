/* ═══════════════════════════════════════════════════════════════
   chapter4.js  –  "The Wall"
   Theme: Crisis, deadline tomorrow | Setting: Sam's room, 2 AM
   Color: Panic red #4E1B1B
   ═══════════════════════════════════════════════════════════════ */
window.Chapter4 = `

# start
n: Thursday. 2:00 AM.
n: The thesis is due in six hours.
(...1000)
n: Sam stares at the screen. The document has a title, an outline, and fragments.
n: Not enough. Not nearly enough.
m: How did it get to this point?
s: Hey, hey. Deep breaths. We've been in tough spots before.
m: This isn't a tough spot. This is a cliff.
s: Cliffs have edges. Edges can be navigated. Let's think about this.
[Panic spiral](#panic_spiral)
[Deep breath, assess what's needed](#assess)
[Call someone for help](#call_help)

# panic_spiral
\`GameState.adjustMeter(20)\`
m: I can't do this. I literally cannot do this.
m: It's too late. There's not enough time.
s: Okay, you're spiraling. I've seen this before. Let me help.
m: You CAUSED this! You said "tomorrow" every single day!
s: ...
m: Every time I tried to start, you said five more minutes. You said "later." You said "relax."
s: I was trying to—
m: What?! What were you trying to do?!
(...1000)
s: ...protect you.
m: From WHAT?
s: From how it feels when you try and it's not good enough.
(...800)
m: ...what?
s: Every time you sit down to write, there's this voice — not me, the other one. The one that says "this isn't smart enough, this isn't original enough, you're going to fail."
s: I'm louder than that voice. That's my job. Drown it out with comfort.
m: So you're not laziness.
s: I never was.
m: You're fear.
s: ...I'm the part of you that would rather feel nothing than feel not good enough.
(...1500)
[That changes right now](#breakthrough)
[I can't deal with this right now](#shutdown)

# assess
\`GameState.adjustMeter(-5)\`
n: Sam takes a breath. Counts to four. Breathes out.
m: Okay. What do I actually need?
n: Sam looks at the rubric. Introduction. Three main sections. Conclusion. Citations.
m: I have the outline. I have some notes from the study group.
{{if _.joinedGroup}}
n: Alex's notes from Tuesday — clear, organized, helpful.
s: Okay, the study group thing... maybe that wasn't terrible.
{{/if}}
s: It's a lot. Maybe you should just—
m: No. No "maybe." What's the minimum viable thesis?
s: The what now?
m: The least I can write and still pass. What does that look like?
n: Sam opens the rubric. 2,000 words minimum. Five sources cited.
m: I can do 2,000 words in four hours. That's 500 an hour. That's... doable.
s: Doable isn't the same as good.
m: Doable is enough tonight.
(#work_through)

# call_help
\`GameState.adjustMeter(-10); _.calledForHelp = true\`
n: Sam picks up the phone. 2 AM.
n: The contact list scrolls by. Mom. Dad. Alex.
s: It's 2 AM. No one's awake. This is—
n: The phone rings. Alex picks up on the third ring.
n: "Sam? It's two in the morning, what—"
m: I'm in trouble. The thesis. I don't have enough.
n: A pause. Sheets rustling.
n: "...how much do you have?"
m: Like, a page. Maybe.
n: "Okay. Okay, I'm getting up. Share me the doc."
s: ...they actually answered.
m: People do that sometimes. When you let them.
s: Huh.
(#alex_helps)

# alex_helps
n: Alex is online in the doc within minutes. Comments appear.
n: "Your second paragraph is actually really good. Build from here."
n: "I'm sending you three sources. Just cite them in your argument."
n: The chat lights up with encouragement and structure.
s: I thought people were energy vampires.
m: Some people are batteries.
s: That's disgustingly wholesome.
n: With Alex's help, the thesis takes shape. Not perfect. But shaped.
n: By 5 AM, it's 2,200 words. Rough but complete.
\`_.ch4_ending = 'supported'\`
\`GameState.adjustMeter(-20)\`
(#chapter_end)

# shutdown
\`GameState.adjustMeter(15)\`
n: Sam closes the laptop.
m: I can't. Not tonight. I'll email the professor in the morning.
s: That's... actually the right call sometimes. Rest matters.
m: This doesn't feel like the right call. This feels like giving up.
s: Giving up and stepping back look the same. The difference is what comes next.
n: Sam lies in bed. Eyes open. The ceiling is dark and close.
n: Sleep doesn't come. But the panic fades to a low hum.
s: Hey, Sam?
m: Yeah?
s: I'm sorry I made this harder than it needed to be.
m: ...yeah. Me too.
\`_.ch4_ending = 'surrender'\`
(#chapter_end)

# work_through
n: Coffee. A timer. The thesis document.
s: A timer? Really? Putting yourself on the clock?
m: 25 minutes on, 5 minutes off. It's called Pomodoro.
s: It's called torture with an Italian name.
n: Sam starts the timer. And writes.
(...800)
n: The first 25 minutes produce 400 words. Not great. But 400 words.
s: Your introduction is weak.
m: I know. But it exists. That's more than it was an hour ago.
n: Timer. Break. Timer. Write. Timer. Break.
n: 3 AM becomes 4 AM. 4 AM becomes 5 AM.
n: The coffee runs out. Sam keeps going on momentum alone.
s: You look terrible.
m: I feel terrible.
s: But you're still going.
m: Yeah. I'm still going.
(...600)
n: 5:30 AM. 2,400 words. Conclusion written. Citations added.
n: It's not the best thesis. It might not even be a good one.
n: But it's finished.
m: It's done.
s: ...it's done.
s: You know what? I didn't think you'd make it.
m: Neither did I.
s: But you did it in spite of me. That counts for something.
\`_.ch4_ending = 'grit'\`
\`GameState.adjustMeter(-15)\`
(#chapter_end)

# breakthrough
\`GameState.adjustMeter(-10)\`
n: Something shifts in Sam. The panic is still there, but it's different now.
n: Not paralyzing. Propelling.
m: You're not my enemy. But you're not my friend either.
s: I... I don't know what I am.
m: You're a coping mechanism. And I needed you when I was younger.
m: But right now, I need you to be quiet so I can work.
s: ...okay.
n: For the first time, the sloth goes silent.
n: Sam opens the thesis document. And writes.
(...1000)
n: The words aren't perfect. They're not brilliant. But they're honest.
n: Sam writes about what was hard and what was learned.
n: About the gap between knowing what to do and doing it.
n: The thesis becomes something real.
n: By 5 AM, it's 2,800 words. The best work Sam has done all semester.
m: Hey, sloth?
s: ...yeah?
m: Thanks for being honest with me.
s: That might be the first time anyone's thanked their procrastination.
m: You're not procrastination. You're the part of me that's scared.
s: ...yeah. I guess I am.
\`_.ch4_ending = 'breakthrough'\`
\`GameState.adjustMeter(-25)\`
(#chapter_end)

# chapter_end
(...1000)
n: End of Chapter 4: The Wall.
(...600)
{{if _.ch4_ending === 'breakthrough'}}
s: You saw me. Really saw me.
s: I'm still here. I'll always be here.
s: But maybe... we can figure out a better way to work together.
{{/if}}
{{if _.ch4_ending === 'grit'}}
s: You powered through. Brute force.
s: I respect it, even if I don't understand it.
{{/if}}
{{if _.ch4_ending === 'supported'}}
s: You asked for help. I never would have suggested that.
s: Maybe that's why you needed to do it yourself.
{{/if}}
{{if _.ch4_ending === 'surrender'}}
s: Sometimes the bravest thing is admitting you can't.
s: Tomorrow is still there. And so are you.
{{/if}}
n: Chapter 4 complete.

`;
