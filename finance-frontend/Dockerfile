# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Pass VITE environment variables if needed during build
ARG VITE_AUTH_API_URL=https://api.odstfin.io
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL

ARG VITE_INVOICE_API_URL=https://api.odstfin.io
ENV VITE_INVOICE_API_URL=$VITE_INVOICE_API_URL

ARG VITE_REQUEST_API_URL=https://api.odstfin.io
ENV VITE_REQUEST_API_URL=$VITE_REQUEST_API_URL

ARG VITE_SETTING_API_URL=https://api.odstfin.io
ENV VITE_SETTING_API_URL=$VITE_SETTING_API_URL

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
