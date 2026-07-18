FROM node:22-alpine AS frontend
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY backend/openapi /workspace/backend/openapi
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-21-alpine AS backend
WORKDIR /workspace
COPY backend/pom.xml backend/pom.xml
RUN mvn -f backend/pom.xml dependency:go-offline
COPY backend/src backend/src
COPY --from=frontend /workspace/frontend/dist frontend/dist
RUN mvn -f backend/pom.xml package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S applyflow && adduser -S applyflow -G applyflow
WORKDIR /app
COPY --from=backend /workspace/backend/target/applyflow.jar app.jar
USER applyflow
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
