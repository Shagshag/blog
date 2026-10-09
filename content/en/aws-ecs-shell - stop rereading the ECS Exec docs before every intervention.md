---
publish: true
title: "aws-ecs-shell: stop rereading the ECS Exec docs before every intervention"
lang: en
created: 2026-10-09T18:00:00
modified: 2026-10-09T18:00:00
tags:
  - aws
  - ecs
  - shell
  - bash
---

_disponible aussi en [[aws-ecs-shell - arrêter de relire sa doc ECS Exec à chaque intervention|Français]]._

A few weeks ago, a badly initialized `locale` sent me digging inside an ECS task in staging. That produced [[The Dockerfile said `fr_FR.UTF-8`. PHP saw `C.UTF-8`|an article on iconv]] and [[ECS Exec en pratique - retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting|a guide to ECS Exec]] (in French). Later, a PrestaShop back office became unreachable and I had to go through ECS Exec again, this time in production, to check the instance's actual configuration, the running processes and how long they had been running ([[14 minutes of cache-warmup on EFS - when a PrestaShop back office becomes unreachable|that incident is written up here]]). The right fix there was to run a cache command directly on the instance. The script I'm describing here didn't exist yet, and it played no part in the diagnosis or the fix. It came afterwards.

## The sequence

Both times, I had to reread my own documentation before I could open the shell. To start a session with ECS Exec, you need the cluster, the service, the task ID and the container name. That's four `aws ecs ...` commands in a row, each one fed with a value copied from the previous output. The guide covers all of this, so I won't go over it again.

You don't get onto an instance often, and it's better if it stays that way. So every time, I've forgotten the exact sequence. It usually happens when you're in a hurry, with your head already full of the problem. In production, juggling `aws` commands you no longer know by heart adds stress you could do without. On top of that, a task ID changes with every deployment, so no command can be replayed as is from one time to the next.

So I wrote [aws-ecs-shell](https://github.com/Shagshag/aws-ecs-shell), a Bash script of about 250 lines, written with the help of AI like pretty much everything I do these days.

## What it looks like

With no arguments, the script shows numbered menus: clusters, then services, then running tasks, then containers.

```
$ ./aws-ecs-shell.sh
1) alpha
2) beta
Cluster (number, Ctrl-D to cancel) > 2
Service: web
1) 7f3c0e1a9b…  (started 2026-10-09T10:00:00Z)
2) c41d88b2e0…  (started 2026-10-08T09:00:00Z)
Task (number, Ctrl-D to cancel) > 1
Container: app
To skip the menus next time: ./aws-ecs-shell.sh --cluster beta --service web --container app
Connecting to ECS task 7f3c0e1a9b… (cluster: beta, container: app)...
```

A menu is skipped when its value is passed as an option (`--cluster`, `--service`, `--task`, `--container`, `--region`, `--profile`) or as an environment variable. A menu with a single entry is picked automatically, which is the most common case for the service and the container.

## Three choices I find useful

**The replay command.** Before connecting, the script prints the command line that skips the menus next time (`To skip the menus next time`). I don't have to remember the names, I just copy them. The task ID is left out when the service had only one task, since it would be useless after the next deployment. A service with several tasks keeps its ID in the command.

**The no-terminal mode.** When standard input isn't a terminal (cron, a pipe, another script), there are no menus. The script then requires `--cluster`, `--service` or `--task`, and `--container` if the task has several, and it lists the available containers in the error message. It never hangs waiting for input.

**A single session with a real TTY.** The script ends with `exec aws ecs execute-command --interactive`. That means one persistent SSM session: `cd` and `export` carry over from one command to the next, and `vim`, `top` and Ctrl-C behave normally.

The shell it starts is `bash` if the image has it, `sh` otherwise. `execute-command` splits `--command` on spaces and executes the first word without going through a shell, so an `if` can't be passed as is. The test is base64-encoded and decoded inside the container, with `${IFS}` standing in for the spaces so that the whole thing stays a single word. It's the same idea as the one in the guide for passing a script, boiled down to one line.

## The rest

At startup, the script checks that `aws` and `session-manager-plugin` are in the `PATH` and that the credentials work, then that the task exists and has ECS Exec enabled. Each failure gives a message saying what to fix, rather than a raw API error.

Two details come from the fact that I work on Windows. Under Git Bash, `aws.exe` ends its lines with a CRLF, and a stray `\r` in an ARN is enough for ECS to reject it with `Unexpected number of separators`. The script strips those `\r`. It's also compatible with Bash 3.2, the version that ships with macOS.

The script only reads the ECS API to build its menus and changes nothing on the AWS side. But once you're in the shell, everything you type runs in the environment you connected to. It doesn't make an intervention any less risky, it just makes it quicker to start.

The code is MIT-licensed: [github.com/Shagshag/aws-ecs-shell](https://github.com/Shagshag/aws-ecs-shell). The prerequisites (AWS CLI, Session Manager plugin, a task started with `enableExecuteCommand`, a task role with `ssmmessages:*`) are in the README.
