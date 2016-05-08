# CLI Documentation

## Usage

```
klyng --help
klyng --beacon-up
klyng --beacon-down
klyng -n <job-size> <klyng-app-entry>
klyng -n <job-size> <klyng-app-entry> -m <machines-file>
```

## Options

| Alias| Full Name                  | Description                                         |
|------|----------------------------|-----------------------------------------------------|
| -h   | --help                     | shows the help guide and exits                      |
| -u   | --beacon-up                | starts the beacon daemon in the background          |
| -d   | --beacon-down              | takes the beacon process down if it's running       |
| -n   | --num-processes   | the number of processes to start a job with         |
| -m   | --machines       | the path to the machines file to start a job across |
