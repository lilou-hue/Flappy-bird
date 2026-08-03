/* ═══════════════════════════════════════════════════════════════
   chapter2.js  –  "The Comfort Zone"
   Theme: Social avoidance | Setting: Campus / library
   Color: Social blue #1B2D4E
   ═══════════════════════════════════════════════════════════════ */
window.Chapter2 = `

# start
n: Tuesday afternoon. The campus buzzes with life.
n: Students stream between buildings like ants with backpacks.
(...800)
n: Sam's phone buzzes. A text from Alex:
n: "Hey! Study group at the library in 20. You coming?"
s: Ugh. People.
s: You know what people means? Talking. Performing. Pretending you have your life together.
s: Or... you could just not go.
[Text back "on my way!"](#go_group)
[Make an excuse](#make_excuse)
[Just... don't reply](#ignore_text)

# go_group
\`GameState.adjustMeter(-10); _.wentToGroup = true\`
s: Wait, really? Voluntarily being around humans?
m: Alex has been asking for weeks. I should go.
s: You SHOULD do a lot of things. "Should" is just guilt wearing a tie.
n: Sam walks toward the library anyway. The sloth grumbles.
(#library_arrive)

# make_excuse
\`GameState.adjustMeter(10); _.madeExcuse = true\`
m: "Sorry, not feeling great today. Next time?"
s: Perfect. Believable. Not even technically a lie — you don't FEEL great about going.
n: The "delivered" checkmark appears. Then "read." No reply.
(...800)
s: See? They're fine. Everyone's fine.
m: ...are they though?
s: Of course! People are resilient. Unlike your social battery, which is at like 3%.
[Head to the library alone instead](#library_solo)
[Go back to the dorm](#dorm_retreat)

# ignore_text
\`GameState.adjustMeter(15); _.ignoredAlex = true\`
s: The beauty of not replying is that it's technically not saying no.
s: It's saying "maybe" in the most efficient way possible.
n: Sam puts the phone face-down. The notification light blinks. And blinks. And blinks.
(...1000)
n: Another text: "Sam? You good?"
s: They're just being polite. They don't actually need you there.
m: What if they think I'm mad at them?
s: Then they'll ask, and you can say no, and everyone moves on. System works.
[Okay, actually go](#go_group)
[Keep ignoring it](#full_avoidance)

# full_avoidance
\`GameState.adjustMeter(15)\`
n: Sam watches the notifications pile up. Three texts. Then silence.
s: See? It passed. Everything passes if you wait long enough.
m: I feel awful.
s: That's just your brain being dramatic. Let's do something fun instead.
(#dorm_retreat)

# library_arrive
n: The library's warm yellow lights spill out through tall windows.
n: Sam spots Alex and two others at a table in the corner.
n: They wave.
s: You can still leave. Pretend you got a call. Very classic move.
m: I'm already here.
[Sit down and join](#join_group)
[Hover awkwardly, then sit at a nearby table alone](#hover_alone)

# join_group
\`GameState.adjustMeter(-10); _.joinedGroup = true\`
n: Sam sits down. Alex slides over a coffee.
n: "Glad you made it! We're going over the psych chapters."
s: This is terrible. You're going to have to TALK about THINGS.
(...600)
n: But something surprising happens.
n: The material makes more sense when someone explains it out loud.
n: Alex draws a diagram. The others laugh at a bad mnemonic.
s: ...okay. This isn't the worst thing ever. I'll admit that.
m: This is actually... kind of nice?
s: Don't get used to it. This is an anomaly.
n: An hour passes. Sam has learned more than in three solo study sessions.
(#group_end)

# hover_alone
\`GameState.adjustMeter(10); _.satAlone = true\`
n: Sam picks a table close enough to see the group but far enough to not be part of it.
s: Perfect distance. Close enough to look social, far enough to avoid talking.
n: Alex glances over and waves Sam to come join.
m: ...
s: Just wave back. Universal sign for "I'm fine over here."
n: Sam waves. A small, tight smile. Alex shrugs and turns back to the group.
n: The sloth settles in, satisfied.
s: See? You're at the library. That's basically studying.
m: I'm watching other people study. That's not the same thing.
s: It's adjacent. Study-adjacent.
[Actually go join them](#join_group)
[Open the textbook, study alone](#study_solo)

# study_solo
\`GameState.adjustMeter(5)\`
n: Sam opens the psych textbook. Page one. The words blur together.
n: Phone out. Quick check. Just notifications.
(...600)
s: The textbook isn't going anywhere. But that meme might expire.
n: Twenty minutes pass. Sam has read the same paragraph four times.
m: Why can't I focus?
s: Because focusing is hard and scrolling is easy. I don't make the rules.
(#library_end_solo)

# library_solo
\`GameState.adjustMeter(5)\`
n: Sam enters the library and finds a quiet corner.
n: The textbook comes out. The highlighters. The whole setup.
s: Look at you. Academic aesthetic. Very Instagram-worthy.
m: I'm actually going to try.
s: Sure you are. But first, has anyone texted back?
n: Sam checks the phone. No new messages.
(...600)
n: The quiet is nice at first. Then it's heavy.
n: Sam watches other groups chatting, sharing notes, laughing.
m: Maybe I should have gone to the study group.
s: Too late now. Can't walk in halfway through. That's weird.
m: Is it though?
s: Extremely weird. Trust me on this.
(#library_end_solo)

# dorm_retreat
n: Sam's dorm room. The familiar cave.
n: Bed, laptop, half-eaten chips from yesterday. Home.
s: Now THIS is a study environment. Maximum comfort, minimum judgment.
n: Sam opens the laptop. The thesis document appears.
n: Cursor blinks. Sam stares at it.
(...800)
s: You know what helps with writer's block? A break BEFORE you start.
s: Pre-emptive rest. It's a strategy.
[Watch something "quick"](#watch_show)
[Try to write something, anything](#force_write)

# watch_show
\`GameState.adjustMeter(15)\`
s: One episode. That's the rule. One episode and then productivity.
n: Three episodes later.
s: Okay technically that was one episode three times.
m: It's 6 PM. I've done nothing all day.
s: You rested! That's something! Resting is an action!
m: Not when there's a thesis due.
s: Due THURSDAY. Today is Tuesday. That's still future-Sam territory.
\`_.ch2_ending = 'avoidance'\`
(#chapter_end)

# force_write
\`GameState.adjustMeter(-5)\`
n: Sam types a sentence. Deletes it. Types another.
s: That sentence was bad. Delete it.
m: You don't even know what I wrote.
s: I can tell by the vibes. The vibes are bad.
n: But Sam keeps typing. Slowly. Painfully. Word by word.
n: It's not good writing. But it's words on a page.
s: ...are you seriously still going?
m: If I stop now I'll never start again. I know how I work.
s: Hmph. Fine. But I'm not helping.
n: By 6 PM, Sam has a rough paragraph. Ugly, raw, but real.
s: I hate to say it, but... that's not nothing.
\`_.ch2_ending = 'effort'\`
\`GameState.adjustMeter(-10)\`
(#chapter_end)

# group_end
n: The study group wraps up. Alex bumps Sam's shoulder.
n: "Same time Thursday? Before the exam?"
{{if _.ch1_ending === 'productive'}}
s: Look at you. A study group AND you started your thesis yesterday. Who even are you?
{{/if}}
{{if _.ch1_ending === 'stress'}}
s: Great, now you have a social obligation AND a thesis to stress about.
{{/if}}
m: Yeah. Thursday. I'll be there.
n: Sam walks out of the library. The air is cool. The sky is orange.
n: For the first time today, the knot in Sam's chest loosens just a little.
s: ...fine. That wasn't terrible. But it was an exception.
\`_.ch2_ending = 'connection'\`
\`GameState.adjustMeter(-15)\`
(#chapter_end)

# library_end_solo
n: The library closes at 9. Sam packs up, having absorbed maybe 20% of the material.
n: The walk back to the dorm is quiet.
n: The phone screen shows Alex's unanswered texts.
{{if _.ignoredAlex}}
s: You'll text them tomorrow. Tomorrow is perfect for texting.
m: You say that about everything.
s: Because it's always true.
{{/if}}
{{if _.madeExcuse}}
n: Sam wonders if the excuse was transparent. If Alex saw through it.
s: Even if they did, people understand. Everyone has off days.
m: I have off weeks.
s: Then people understand more.
{{/if}}
\`_.ch2_ending = 'isolation'\`
\`GameState.adjustMeter(10)\`
(#chapter_end)

# chapter_end
(...1000)
n: End of Chapter 2: The Comfort Zone.
(...600)
{{if _.ch2_ending === 'connection'}}
s: You did the hard thing. You showed up.
s: I didn't think you had it in you. Don't make a habit of it.
{{/if}}
{{if _.ch2_ending === 'effort'}}
s: You wrote something. Ugly, messy, but real.
s: I guess that's... one way to do things.
{{/if}}
{{if _.ch2_ending === 'avoidance'}}
s: See? Nothing went wrong. You're safe. You're comfortable.
s: ...so why does it feel like that?
{{/if}}
{{if _.ch2_ending === 'isolation'}}
s: I kept you safe today. That's what I do.
s: But Sam... I'm starting to wonder if safe is the same as okay.
{{/if}}
n: Chapter 2 complete.

`;
