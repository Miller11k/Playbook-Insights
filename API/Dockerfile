# Use the official Node.js image
FROM node:16

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json (if available)
COPY package*.json /app/

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . /app/

# Build the TypeScript files
RUN npm run build

# Expose the port the API runs on
EXPOSE 3000

# Command to run the API
CMD ["npm", "start"]