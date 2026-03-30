# Development Setup

This guide explains how to set up the Dataflowcanvas project for local development.

## Prerequisites

- Node.js (v20 or higher)
- npm (v9 or higher) or yarn
- Git

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dataflowcanvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory based on the example below:
   ```env
   # Example environment variables
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   # Add any other required environment variables here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:9002` (or the port specified in the script).

## Available Scripts

In the `package.json` file, you will find the following scripts:

- `npm run dev` - Starts the development server using Next.js with Turbopack on port 9002
- `npm run build` - Builds the application for production
- `npm run start` - Starts the production server
- `npm run lint` - Runs ESLint for code linting
- `npm run typecheck` - Runs TypeScript type checking without emitting files
- `npm run genkit:dev` - Starts the Genkit development server for AI features
- `npm run genkit:watch` - Watches for changes and restarts the Genkit dev server

## Testing

The project includes a basic test for the pipeline data model. To run tests:

```bash
# If using Jest (to be set up)
npm test

# For now, you can run the typecheck to ensure TypeScript correctness
npm run typecheck
```

## Code Quality

- The project uses ESLint for linting. Run `npm run lint` to check for linting errors.
- TypeScript is used for type safety. Run `npm run typecheck` to check for TypeScript errors.
- Follow the existing code style and conventions.

## Project Structure

- `src/` - Source code
  - `components/` - React components
  - `lib/` - Utility functions and data models
  - `app/` - Next.js app directory
  - `styles/` - CSS and styling
- `public/` - Static assets
- `tests/` - Test files (to be expanded)

## Troubleshooting

- **Port already in use**: If you get an error that the port is already in use, try killing the process using that port or change the port in the dev script.
- **Environment variables**: Make sure to set up the required environment variables in `.env.local`.
- **Dependencies**: If you encounter issues with dependencies, try deleting `node_modules` and `package-lock.json` then run `npm install` again.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.