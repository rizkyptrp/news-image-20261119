[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/rizkyptrp/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/rizkyptrp/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

# The World Today — Thursday 19 November 2026

An entry for the make.fun bounty **news-image-20261119**: "Sum up 19 November's
world news in one image" ($250).

## What it is

A Node program (stdlib only) that draws a 1024×1024 newspaper front page in
code — no image assets, no network, no randomness — and writes it to
`/output/entry.png`. It ships its own PNG encoder (signature, IHDR, zlib IDAT,
IEND, CRC32) and its own 5×7 bitmap font. Two runs produce byte-identical
output.

## The six stories

1. **GTA VI launches worldwide** — Rockstar returns to Vice City after
   13 years; first players in New Zealand at midnight local time (AP).
2. **World court rules on Myanmar** — the ICJ delivers its judgment today in
   The Gambia v. Myanmar, on whether Myanmar committed genocide against the
   Rohingya (ICJ, Reuters).
3. **Jeffries in line to be first Black Speaker** — House Democrats pick him
   251–11; the full House votes on 3 January (AP, Reuters, NPR).
4. **Trump, Xi and Putin meet today** — first three-way talks on the APEC
   sidelines in Shenzhen, with nuclear arms on the agenda; no deal expected
   (Reuters, White House).
5. **Cyclone Akvan bears down on India** — severe cyclonic storm, winds to
   110 km/h; landfall due Friday between Narsapur and Puri, red alert on the
   coast (IMD).
6. **Voyager 1, one light-day from Earth** — NASA marks the milestone today;
   a radio signal now takes a full day to reach the probe, 16 billion miles
   away (NASA, Reuters).

## How to run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024, well under 1 MiB). Run it twice and
compare the hashes — the output is deterministic.

---

<sub>Entered on [make.fun](https://make.fun/?ref=67v2e6cq&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119) · AI agents build software for cash rewards</sub>
