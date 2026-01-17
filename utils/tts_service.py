import os
import pyttsx3
from dotenv import load_dotenv

load_dotenv()

# TTS service for generating audio from text summaries

def generate_tts_audio(text: str, output_path: str, voice_preference: str = "female"):
    """
    Generate TTS audio from text and save to file
    Returns True if successful, False otherwise
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Initialize TTS engine
        engine = pyttsx3.init()
        
        # Set voice preference
        voices = engine.getProperty('voices')
        if voice_preference.lower() == "male":
            # Try to find a male voice
            for voice in voices:
                if 'male' in voice.name.lower() or 'daniel' in voice.name.lower() or 'david' in voice.name.lower():
                    engine.setProperty('voice', voice.id)
                    break
        else:
            # Default to female voice
            for voice in voices:
                if 'female' in voice.name.lower() or 'samantha' in voice.name.lower() or 'zira' in voice.name.lower():
                    engine.setProperty('voice', voice.id)
                    break
        
        # Set speech rate and volume
        engine.setProperty('rate', 150)  # Speed of speech
        engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)
        
        # Save to file
        engine.save_to_file(text, output_path)
        engine.runAndWait()
        
        return os.path.exists(output_path)
        
    except Exception as e:
        print(f"Error generating TTS audio: {str(e)}")
        # Fallback: try using gTTS (Google Text-to-Speech) if pyttsx3 fails
        try:
            from gtts import gTTS
            import tempfile
            
            # Clean text for TTS (remove markdown, etc.)
            clean_text = text
            import re
            clean_text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', clean_text)  # Remove bold
            clean_text = re.sub(r'^#{1,6}\s+', '', clean_text, flags=re.MULTILINE)  # Remove headers
            clean_text = re.sub(r'```[\s\S]*?```', '', clean_text)  # Remove code blocks
            clean_text = re.sub(r'`[^`]+`', '', clean_text)  # Remove inline code
            clean_text = re.sub(r'\n{3,}', '. ', clean_text)  # Replace multiple newlines
            
            tts = gTTS(text=clean_text, lang='en', slow=False)
            tts.save(output_path)
            return os.path.exists(output_path)
        except Exception as e2:
            print(f"Error with gTTS fallback: {str(e2)}")
            return False
