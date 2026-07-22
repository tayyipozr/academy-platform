FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B

COPY src/ src/

RUN ./mvnw clean package \
    -DskipTests \
    -B


FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system academy \
    && useradd \
       --system \
       --gid academy \
       --home-dir /app \
       --shell /usr/sbin/nologin \
       academy

WORKDIR /app

COPY --from=builder \
    /workspace/target/*.jar \
    application.jar

RUN chown academy:academy application.jar

USER academy

EXPOSE 8080

ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", \
  "exec java $JAVA_OPTS -jar application.jar"]
