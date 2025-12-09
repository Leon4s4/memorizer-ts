# @memorizer/web

React frontend for Memorizer - AI memory service.

## Features

- **Modern React**: React 18 with hooks
- **TypeScript**: Fully typed
- **Vite**: Fast development with HMR
- **Tailwind CSS**: Utility-first styling
- **React Router**: Client-side routing
- **Responsive Design**: Works on all screen sizes

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── pages/
│   ├── Index.tsx          # Memory list page
│   ├── Create.tsx         # Create memory form
│   ├── Edit.tsx           # Edit memory form
│   ├── View.tsx           # View memory details
│   └── Stats.tsx          # Statistics dashboard
├── components/
│   └── Layout.tsx         # Main layout with navigation
├── styles/
│   └── globals.css        # Global styles + Tailwind
├── App.tsx                # Root component with routing
└── main.tsx               # Entry point
```

## Pages

### Index (/)
- Lists all memories
- Quick actions: View, Edit, Delete
- Filters by type and tags
- Pagination support

### Create (/create)
- Form to create new memory
- Fields: Type, Title, Content, Tags, Source, Confidence
- Validation and error handling

### View (/memories/:id)
- Display memory details
- Show metadata (type, tags, version, dates)
- Actions: Edit, Delete

### Edit (/memories/:id/edit)
- Form to edit existing memory
- Pre-filled with current data
- Shows current version info

### Stats (/stats)
- Memory count statistics
- Type distribution
- Tag usage
- Average confidence
- Database size

## API Integration

All API calls are made to `/api/*` endpoints which are proxied to the backend server (http://localhost:5000) in development.

### Vite Proxy Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

## Styling

Uses Tailwind CSS with custom theme variables for light/dark mode support:

```css
/* Light mode */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... */
}

/* Dark mode */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

## Future Enhancements

### Phase 2
- [ ] Search UI with semantic search
- [ ] Real-time embedding generation feedback

### Phase 3
- [ ] Version history viewer
- [ ] Diff comparison UI
- [ ] Relationship graph visualization

### Phase 4
- [ ] Admin dashboard
- [ ] Background job progress indicators
- [ ] Real-time updates via SSE

### Phase 5
- [ ] MCP client integration
- [ ] Advanced filtering and sorting

## License

MIT
