# Project Brief

## Background
Good morning Claude - today we are going to make a poetry bot, but we we are going to make a poetry bot, but we are going to construct this app with as much care and precision as I do to write poems. 

A little about me - I studied creative writing in college and have published several novels. I love poetry, and teach poetry classes at my job. i like bringing together code projects and poetry because I find they have a lot in common - distilling words into their most elegant, effective form to achieve a specific function (in poetry's case, the function is emotional payoff).

One way I conceptualize poetry is like this: the human brain is a pattern recognition machine that takes inputs from a diverse array of sensory experience. Sometimes, these inputs align in a delightful way, trancending the sensory experience and communicating something much larger. 

Think of particles floating in the air and by happenstance they line up perfectly to point at the sun. This is one way I think of poetry. 

When we build today's app, I want you to keep all of this in mind, as I think it will help clarify the scope and intent of this project. 

## Summary
Today, we will be building a poetry agent. This agent will live persistently and passively accumulate information until a poem emerges. The bot will write the poem and send it to me for review. I'll give some notes, which the agent will internalize, and begin working on the next poem. 

I would love any kind of element that allows me to see the agent's thought process in constructing the poem. I have a couple ideas of what this could look like, but I like the idea of creating a visualizer of floating particles, labeled with concepts or topics that the bot is working on weaving into a poem. When a poem is constructed, I'd love to see those particles align or get grouped or show how the agent found the connections between them. I have a vague idea about how I want this to pan out, and if it's unclear I'm willing to scrap or simplify this visual element. 

## Design Specifications
* Produces poems on its own and also when asked. 
* Shows thought process in creating poems.
* Takes input from local weather. 
* Takes input from the current season. 
* Derives sentimiment from environment inputs. 
* Can generate interests and research those interests to construct poems. 
* Allows me to review finished poems and give notes that are applied to any future poems written. 
* Allows me to submit poems and articles via text input that can help inform or guide the poetry writing. 
* (Optional) Particle visualizer where nodes are concepts, topics, ideas, and other data that float around until a poem emerges. 
* Uses creative, intelligent LLMs as the creative engine - would love to use local ollama models unless there is a good, cost-effective API option. 

