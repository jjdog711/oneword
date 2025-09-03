# OneWord App

A React Native app built with Expo SDK 53 that allows users to send one word per day to their connections with various reveal options, plus full direct messaging capabilities.

## Features

- **Authentication**: No-verification signup and login via Supabase
- **Word Sharing**: Send one word per day to connections
- **Reveal Options**: 
  - Instant: Reveal immediately
  - Mutual: Reveal only when both parties send a word
  - Scheduled: Reveal at a specific time
- **Direct Messaging**: Full-featured DM system with real-time messaging
- **Thread View**: View conversation history with connections
- **Journal**: Track your daily words and reflections
- **Public Feed**: See today's most popular words
- **Friends Management**: Add, manage, and connect with friends

## Tech Stack

- **Frontend**: React Native with Expo SDK 53
- **State Management**: Zustand with persistence
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Navigation**: Expo Router
- **Styling**: React Native StyleSheet
- **Icons**: Lucide React Native
- **Authentication**: Supabase Auth (Google OAuth + Email/Password)

## Project Structure

```
oneword/
├── app/                    # Expo Router app directory
│   ├── _layout.tsx        # Root layout with auth
│   ├── index.tsx          # Landing page with sign in/up
│   ├── (tabs)/            # Tab navigation
│   │   ├── _layout.tsx    # Tab layout
│   │   ├── index.tsx      # Home screen
│   │   ├── journal.tsx    # Journal screen
│   │   ├── friends.tsx    # Friends management
│   │   ├── requests.tsx   # Friend requests
│   │   ├── messages.tsx   # DM conversations list
│   │   ├── public.tsx     # Public feed
│   │   └── settings.tsx   # Settings screen
│   ├── chat/              # DM chat screens
│   │   └── [conversationId].tsx  # Individual chat
│   ├── new-conversation.tsx      # Start new conversation
│   ├── connection/        # Connection management
│   │   └── [id].tsx       # Connection details
│   ├── send/              # Word sending
│   │   └── [connectionId].tsx  # Send word to connection
│   └── auth/              # Authentication
│       └── callback.tsx   # OAuth callback
├── src/
│   ├── components/        # Reusable components
│   │   ├── SignInPrompt.tsx     # Authentication prompt
│   │   └── AuthStatus.tsx       # Auth status display
│   ├── lib/               # Utility libraries
│   │   ├── database.ts    # Database utilities
│   │   ├── errors.ts      # Error handling
│   │   ├── logger.ts      # Logging utilities
│   │   ├── reveal.ts      # Word reveal logic
│   │   ├── time.ts        # Time utilities
│   │   └── validate.ts    # Validation utilities
│   ├── services/          # Service layer
│   │   ├── supabase.ts    # Supabase client & auth
│   │   ├── dm.ts          # Direct messaging service
│   │   └── midnight.ts    # Midnight processing
│   ├── store/             # State management
│   │   └── app.ts         # Zustand store
│   └── types.ts           # TypeScript types
├── supabase/              # Supabase configuration
│   ├── config.toml        # Supabase config
│   └── migrations/        # Database migrations
│       ├── 001_init.sql           # Initial schema
│       ├── 002_social.sql         # Social features
│       ├── 003_enhance_profiles.sql  # Profile enhancements
│       └── 004_dm_system.sql      # DM system
└── assets/                # App assets
```

## Direct Messaging System

The app now includes a comprehensive DM system with the following features:

### Core Features
- **Real-time messaging** between users
- **Conversation management** with friend list
- **Message interactions** (reply, edit, delete)
- **Read receipts** and message status
- **Message reactions** (emojis)
- **Conversation archiving** and organization

### Database Schema
- `conversations` - DM threads between users
- `messages` - Individual messages with metadata
- `message_status` - Read receipts and delivery status
- `message_reactions` - Message reactions and emojis

### Security
- **Row Level Security (RLS)** policies ensure privacy
- **User authentication** required for all DM features
- **Message ownership** validation for editing/deletion

## Getting Started

### Prerequisites
- Node.js 18+ 
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd oneword
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Create a `.env` file with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Apply database migrations**
```bash
supabase db push
```

5. **Configure authentication**
   - Go to Supabase Dashboard → Authentication → Settings
   - Disable "Confirm email" for no-verification signup
   - Configure Google OAuth if desired

6. **Start the development server**
```bash
npx expo start
```

## Testing the DM System

Use the comprehensive testing guide in `DM_TESTING_GUIDE.md` to verify all DM functionality:

```bash
# Follow the testing phases:
1. Database Setup
2. Core Functionality
3. Real-time Features
4. UI/UX Testing
5. Security Testing
6. Error Handling
7. Performance Testing
8. Edge Cases
```

## Key Features

### Authentication
- **No-verification signup** for immediate access
- **Google OAuth** integration
- **Email/password** authentication
- **Session management** with automatic sign-out

### Word Sharing
- **Daily word limits** (one word per day per connection)
- **Multiple reveal options** (instant, mutual, scheduled)
- **Connection management** with friend requests
- **Public word sharing** with privacy controls

### Direct Messaging
- **Real-time conversations** with friends
- **Message history** and threading
- **Interactive features** (reactions, replies, editing)
- **Conversation organization** (archiving, pinning)

### User Experience
- **Modern UI** with smooth animations
- **Responsive design** for all screen sizes
- **Offline support** with data persistence
- **Error handling** with user-friendly messages

## Development

### Adding New Features
1. **Database**: Add migrations in `supabase/migrations/`
2. **Types**: Update `src/types.ts` with new interfaces
3. **Services**: Create service functions in `src/services/`
4. **Components**: Build reusable components in `src/components/`
5. **Screens**: Add new screens in `app/` directory
6. **State**: Update Zustand store in `src/store/app.ts`

### Code Style
- **TypeScript** for type safety
- **Functional components** with hooks
- **Consistent naming** conventions
- **Error boundaries** for robust error handling
- **Comprehensive logging** for debugging

## Deployment

### Production Build
```bash
# Build for production
npx expo build:android
npx expo build:ios
```

### Environment Variables
Ensure all environment variables are set in your production environment:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Google OAuth credentials (if using)

## Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly using the testing guide
5. **Submit** a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the testing guides for troubleshooting
- Review the Supabase documentation
- Open an issue for bugs or feature requests

---

**OneWord** - Share one word, every day, and now chat freely with friends! 💬✨