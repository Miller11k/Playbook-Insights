# Use the official Node.js image to build the React app
FROM node:16 as build

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json (if available)
COPY package*.json /app/

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . /app/

# Build the React app
RUN npm run build

# Use Nginx to serve the frontend
FROM nginx:alpine

# Copy the built React app to Nginx's default folder
COPY --from=build /app/build /usr/share/nginx/html

# Expose the port Nginx is listening on
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]