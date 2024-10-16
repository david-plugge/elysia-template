FROM debian:12 AS depedencies
RUN useradd web && \
    cat /etc/passwd | grep web > /etc/passwd_web

COPY --chmod=500 --chown=web ./build/app /server

RUN mkdir /depedencies
RUN for i in `ldd /server | grep -v linux-vdso.so.1 | awk {' if ( $3 == "") print $1; else print $3 '}`; do cp --parents $i /depedencies/ ; done

FROM scratch
COPY --from=depedencies /etc/passwd_web /etc/passwd
COPY --from=depedencies /depedencies /
COPY --from=depedencies /server /server

USER web
EXPOSE 3000/tcp
ENTRYPOINT [ "/server" ]
