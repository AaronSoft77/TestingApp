# Stage 1: Base & Development
FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Expose the Vite port
EXPOSE 5173
# Run Vite with --host so it's accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 2: Production Build (Your existing logic)
FROM dev AS build
RUN npm run build

# Stage 3: Production Serve (Your existing logic)
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
