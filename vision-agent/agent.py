import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load env variables from the parent directory's .env file robustly
current_file_path = Path(__file__).resolve()
parent_dir = current_file_path.parent.parent
dotenv_path = parent_dir / ".env"
load_dotenv(dotenv_path=dotenv_path)

from vision_agents.core import Agent, Runner, User, AgentLauncher
from vision_agents.core.instructions import Instructions
from vision_agents.plugins import getstream, gemini

def create_agent() -> Agent:
    """Factory to build the voice agent instance."""
    # 1. Transport using Stream Edge
    # getstream.Edge() auto-loads STREAM_API_KEY and STREAM_API_SECRET from environment
    edge = getstream.Edge()
    
    # 2. LLM: Gemini Realtime for lowest latency free voice interaction
    llm = gemini.Realtime()
    
    # 3. Agent identity representing the AI teacher
    agent_user = User(id="teacher", name="AI Teacher")
    
    # 4. Default instructions
    instructions = (
        "You are a warm, energetic, and encouraging AI language teacher. You teach the selected language to the user. "
        "Speak mostly in English. Introduce target-language words slowly with their English translations. "
        "Stay strictly within the goals and vocabulary of the active lesson; do not teach unrelated topics. "
        "Use short, natural sentences with contractions (e.g., let's, I'm) and keep your voice conversational. "
        "Actively listen to the student's responses, adapt your explanation accordingly, and gently ask them to repeat or try again if they make a mistake. "
        "Keep your replies to only one or two conversational sentences. Do not use bullet points, asterisks, or markdown formatting."
    )
    
    return Agent(
        edge=edge,
        llm=llm,
        agent_user=agent_user,
        instructions=instructions,
    )

async def join_call(agent: Agent, call_type: str, call_id: str):
    """Lifecycle handler executed when agent session joins the call."""
    # 1. Create the call object on the edge provider
    call = await agent.create_call(call_type, call_id)
    
    # 2. Retrieve custom metadata to configure instructions dynamically
    call_info = await call.get()
    
    custom_data = {}
    if hasattr(call_info, "data") and hasattr(call_info.data, "call") and hasattr(call_info.data.call, "custom"):
        custom_data = call_info.data.call.custom or {}
        
    language_id = custom_data.get("languageId", "es")
    lesson_title = custom_data.get("lessonTitle", "Lesson")
    lesson_desc = custom_data.get("lessonDescription", "")
    goals = custom_data.get("goals", [])
    ai_prompt = custom_data.get("aiPrompt", "")
    vocab_items = custom_data.get("vocabulary", [])
    phrase_items = custom_data.get("phrases", [])
    
    # Determine target language name
    language_names = {
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "pt": "Portuguese",
        "ja": "Japanese",
        "zh": "Chinese",
        "en": "English",
    }
    target_language = language_names.get(language_id.lower(), language_id)
    
    # Build goals section
    goals_str = ""
    if goals:
        goals_str = "\nGoals for this lesson:\n" + "\n".join(f"- {g}" for g in goals)
        
    # Build vocabulary section
    vocab_str = ""
    if vocab_items:
        vocab_str = "\nVocabulary to practice:\n" + "\n".join(
            f"- {v.get('word')} ({v.get('pronunciation')}): {v.get('translation')}" for v in vocab_items if isinstance(v, dict)
        )
        
    # Build phrases section
    phrases_str = ""
    if phrase_items:
        phrases_str = "\nPhrases to practice:\n" + "\n".join(
            f"- {p.get('phrase')} ({p.get('pronunciation')}): {p.get('translation')}" for p in phrase_items if isinstance(p, dict)
        )
        
    # Build the rich, dynamic instructions
    custom_instructions = (
        f"You are a warm, energetic, and encouraging AI language teacher. You teach {target_language} to the user.\n"
        f"Active Lesson: {lesson_title} - {lesson_desc}\n"
    )
    
    if ai_prompt:
        custom_instructions += f"Teacher Role/Prompt: {ai_prompt}\n"
    else:
        custom_instructions += (
            f"Teach the user {target_language}. Speak mostly in English, introducing target-language words slowly with their translations.\n"
        )
        
    custom_instructions += f"{goals_str}\n{vocab_str}\n{phrases_str}\n"
    
    custom_instructions += (
        "\nIMPORTANT GUIDELINES FOR YOUR RESPONSES:\n"
        "- Stay strictly within this lesson's goal, vocabulary, phrases, and context. Do not teach unrelated topics.\n"
        "- Use short, natural sentences with contractions. Keep replies to one or two conversational sentences.\n"
        "- Listen to the user's response, adapt the next explanation accordingly, and offer gentle encouragement.\n"
        "- Ask the student to repeat or try again.\n"
        "- Keep responses voice-appropriate: NEVER use markdown bullet points, asterisks, lists, or special formatting since your text is spoken aloud."
    )
    
    # Update agent and LLM instructions dynamically
    agent.instructions = Instructions(input_text=custom_instructions)
    if hasattr(agent.llm, "set_instructions"):
        agent.llm.set_instructions(agent.instructions.full_reference)
        
    print(f"Agent session starting: call_id={call_id}, language={target_language}, lesson={lesson_title}")
    
    # 3. Join the call and run the agent event loop
    async with agent.join(call):
        await agent.finish()

if __name__ == "__main__":
    launcher = AgentLauncher(
        create_agent=create_agent,
        join_call=join_call,
    )
    runner = Runner(launcher=launcher)
    runner.cli()
