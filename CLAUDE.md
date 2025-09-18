# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chinese vocabulary learning web application that helps users practice English vocabulary with Chinese meanings through a fill-in-the-blank game interface. The application is built as a client-side web app using vanilla HTML, CSS, and JavaScript.

## Architecture

### Core Files Structure
- `index.html` - Main HTML structure with game interface and settings
- `script.js` - Complete game logic, vocabulary management, and user interactions
- `styles.css` - CSS styling with Chinese font support and responsive design
- `public/vocab.txt` - Default vocabulary database file

### Key Components

**Game State Management** (`script.js:38-49`)
- Centralized state object managing vocabulary, progress, scoring, and UI state
- Local storage integration for persistent progress tracking
- Progress mapping system that tracks user performance per word

**Vocabulary System** (`script.js:78-133`)
- Supports custom vocabulary file uploads in TXT format
- Format: `word | chinese_meaning | initial_missing_letters`
- Fallback to default vocabulary if external file unavailable
- Automatic parsing with duplicate detection and validation

**Adaptive Difficulty** (`script.js:135-155`)
- Dynamic difficulty adjustment based on user performance
- Missing letter count increases with correct answers
- Difficulty decreases with incorrect answers or reveals
- Clamped to ensure words remain solvable (preserves first/last letters)

**Choice Generation** (`script.js:433-451`)
- Generates 4 multiple choice options for missing letters
- Ensures one correct answer with 3 plausible distractors
- Uses alphabet randomization to create realistic alternatives

### Development Approach

**No Build Process**: This is a static web application with no build tools, package managers, or compilation steps. Simply open `index.html` in a web browser or serve via any static file server.

**Local Development**: 
- For full functionality (loading `public/vocab.txt`), serve via local HTTP server
- Fallback vocabulary is embedded in `script.js` if file loading fails
- Browser developer tools provide debugging capabilities

**File Upload Feature**: Users can upload custom vocabulary files which are stored in localStorage and persist across sessions.

**Chinese Language Support**: 
- HTML lang attribute set to `zh-Hant` (Traditional Chinese)
- CSS includes Chinese font stack with proper fallbacks
- All UI text and feedback messages are in Chinese

### Data Format

Vocabulary file format (pipe-separated):
```
english_word | chinese_meaning | initial_missing_count
elaborate | 詳細說明；精心製作 | 1
```

Lines starting with `#` are treated as comments and ignored.

### Audio System

The application supports custom audio files for enhanced user experience:
- `public/audio/good.mp3` - Success sound when answer is correct
- `public/audio/fail.mp3` - Error sound when answer is incorrect
- Fallback to Web Audio API generated tones if MP3 files are unavailable
- Volume set to 50% for comfortable listening

### Storage Keys

The application uses localStorage with versioned keys:
- `vocabProgressV1` - User progress per word
- `vocabHighScoreV1` - Highest score achieved  
- `vocabCustomFileV1` - Custom uploaded vocabulary
- `vocabTotalCorrectV1` - Total words answered correctly