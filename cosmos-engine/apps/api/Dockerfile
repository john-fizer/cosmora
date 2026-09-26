FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install --workspace=apps/api --include-workspace-root
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "--experimental-strip-types", "src/server.ts"]
