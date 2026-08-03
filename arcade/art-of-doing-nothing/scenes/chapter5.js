/* ═══════════════════════════════════════════════════════════════
   chapter5.js  –  "Tomorrow Starts Today"
   Theme: Resolution, understanding | Setting: Inside Sam's mind
   Color: Dawn gold #3A2D00
   ═══════════════════════════════════════════════════════════════ */
window.Chapter5 = `

# start
n: Friday morning. The thesis is submitted. The week is over.
n: Sam sits on the edge of the bed. Not tired. Not panicked. Just... still.
(...1000)
n: The sloth appears in the mirror. Smaller than before.
s: Hey.
m: Hey.
s: So... that was a week.
m: Yeah.
s: I need to tell you something. About us. About why I exist.
m: I'm listening.
(#origin)

# origin
n: The room shifts. The walls fade.
n: Sam is somewhere else now. Somewhere internal. A landscape of memory.
(...800)
s: I wasn't always like this, you know.
s: When you were a kid, I was just... caution. Self-preservation.
s: "Don't raise your hand — what if you're wrong?" That was me.
s: "Don't show them your drawing — what if they laugh?" Also me.
m: I remember that.
s: I was trying to keep you safe from embarrassment. From rejection.
s: And for a while, that was enough. Small shields for small threats.
n: The memory landscape shifts. Middle school. High school.
s: But the threats got bigger. Exams. Friendships. The future.
s: And I couldn't protect you from ALL of that. So I learned a new trick.
m: Distraction.
s: Distraction. Delay. Comfort. If you never start, you can never fail.
s: If you never try, no one can tell you you're not good enough.
m: But I still felt not good enough. All the time.
s: I know. I know that now.
(...1000)
[I understand why you did it](#understand)
[I'm angry it took this long to see it](#anger)

# understand
\`GameState.adjustMeter(-15)\`
m: You were scared for me. And this was the only way you knew how to help.
s: I turned "I'm not ready" into a lifestyle. And I'm sorry.
m: Don't be sorry. Just... be different now. Be honest with me.
s: When you feel the pull to procrastinate, that's me saying "this is scary."
m: And I can hear that without obeying it.
s: Yeah. You can.
n: The sloth shrinks a little. Not disappearing. Just... settling.
(#path_forward)

# anger
\`GameState.adjustMeter(-5)\`
m: I lost YEARS to this. Projects I never started. People I never talked to.
m: Opportunities that closed because I was too scared to walk through the door.
s: I know.
m: "I know" isn't enough!
s: You're right. It isn't.
(...800)
s: But anger is honest. Anger means you care about what was lost.
s: And caring is the opposite of what I do. It's the opposite of nothing.
m: ...so being angry at you is progress?
s: Ironic, right? You're growing by yelling at your inner sloth.
m: You're insufferable.
s: I'm part of you. Take it up with management.
(#path_forward)

# path_forward
n: The memory landscape brightens. Dawn colors bleed through.
(...600)
s: So here's what I've learned this week, from watching you:
{{if _.ch1_ending === 'productive'}}
s: Monday, you got up and started. That scared me more than anything.
{{/if}}
{{if _.ch1_ending === 'comfort'}}
s: Monday, I won. But winning didn't feel like I thought it would.
{{/if}}
{{if _.ch1_ending === 'stress'}}
s: Monday, I pushed too hard and you spiraled. That was my fault.
{{/if}}
{{if _.joinedGroup}}
s: Tuesday, you went to that study group. You connected. I hated it. And it was exactly what you needed.
{{/if}}
{{if _.ch2_ending === 'avoidance'}}
s: Tuesday, I kept you in the dorm. Safe. Empty.
{{/if}}
{{if _.ch3_ending === 'discipline'}}
s: Wednesday, you wrote for HOURS. Without me. I didn't know you could do that.
{{/if}}
{{if _.ch3_ending === 'lost'}}
s: Wednesday, the phone swallowed you. I told you it was fine. It wasn't.
{{/if}}
{{if _.ch4_ending === 'breakthrough'}}
s: Thursday, you saw through me. That was the most terrifying and important moment of the whole week.
{{/if}}
{{if _.ch4_ending === 'grit'}}
s: Thursday, you powered through on willpower alone. Brutal, but effective.
{{/if}}
s: And now it's Friday. And you're still here.
m: I'm still here.
s: So what happens now?
[We work together](#together)
[I don't need you anymore](#reject)
[I think you need to change too](#mutual_growth)

# together
\`GameState.adjustMeter(-20)\`
m: You're part of me. I can't get rid of you, and I don't think I should.
s: That's... surprisingly mature.
m: When I'm scared, I need to hear it as "I'm scared" — not as "let's watch Netflix."
s: And when you genuinely need rest?
m: Then we rest. For real. Not as avoidance. As recovery.
s: How do I tell the difference?
m: We figure it out. Together. Day by day.
s: ...deal.
n: The sloth extends a clawed hand. Sam takes it.
n: It's warm. Familiar. Complicated.
\`_.ch5_ending = 'integration'\`
(#finale)

# reject
\`GameState.adjustMeter(-10)\`
m: I need to be stronger than you. I need to override you every time.
s: ...that sounds exhausting.
m: Maybe. But it's better than where I was.
s: Willpower alone doesn't last, Sam. There will be days when you're tired, and I'll still be here, whispering.
m: Then I'll be tired AND productive.
s: That's... one approach.
n: The sloth steps back. Not gone. But at a distance.
n: A wall between them. Functional, but cold.
\`_.ch5_ending = 'willpower'\`
(#finale)

# mutual_growth
\`GameState.adjustMeter(-15)\`
m: I need to change. But so do you.
s: Me? I'm a FEELING. Feelings don't change.
m: Sure they do. Fear can become caution. Avoidance can become rest.
s: That sounds like therapy talk.
m: Maybe therapy wouldn't be the worst thing.
s: ...
s: Did you just suggest getting help? Voluntarily?
m: Weird, right?
s: Deeply weird. Also... maybe smart.
n: The sloth looks different. Not smaller. Just... gentler.
n: Still there. Still slow. But honest about what it is.
\`_.ch5_ending = 'growth'\`
(#finale)

# finale
(...1500)
n: The memory landscape dissolves. Sam is back in the bedroom.
n: Friday morning light pours in. Golden. Warm.
n: The phone buzzes. A text from Alex: "We survived the week! Coffee?"
(...600)
{{if _.ch5_ending === 'integration'}}
s: Go get coffee. And actually enjoy it — not as avoidance. Just as coffee.
m: Just as coffee.
{{/if}}
{{if _.ch5_ending === 'willpower'}}
m: Coffee first. Then I'm reorganizing my entire schedule.
s: ...sounds productive.
{{/if}}
{{if _.ch5_ending === 'growth'}}
s: Go get coffee. And maybe... look up that campus counseling number.
m: Maybe I will.
s: No "maybe." Do it.
m: Since when are you the motivating one?
s: I contain multitudes.
{{/if}}
(...800)
n: Sam stands up. Stretches. Smiles — small, real, imperfect.
s: Hey, Sam?
m: Yeah?
s: Tomorrow's going to be hard too.
m: I know.
s: But today was harder. And you made it.
m: We made it.
s: ...yeah. We did.
(...1000)
n: The Art of Doing Nothing.
n: End.

\`_.fourthWall = true\`
(...1500)
s: Oh, and one more thing.
s: I know you're there. The one playing this.
s: You have an inner sloth too. Everyone does.
s: It's not laziness. It's never laziness.
s: It's the part of you that's scared of not being enough.
s: And the fact that you played this far means you're already braver than you think.
s: Now close this game and go do the thing you've been putting off.
s: ...after one more minute. Five tops.
n: The End.
(#chapter_end)

# chapter_end
\`_.ch5_complete = true\`

`;
