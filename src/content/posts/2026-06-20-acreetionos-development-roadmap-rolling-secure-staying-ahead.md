---
title: "AcreetionOS Development Roadmap: Rolling Secure, Staying Ahead of CVEs"
description: "A look at AcreetionOS development progress and how our Arch-based distro handles the latest Linux ecosystem CVEs — from the xz backdoor to OpenSSH regreSSHion."
pubDate: 2026-06-20T13:20:06.588Z
tags:
  - acreetionos
  - arch linux
  - security
  - cve
  - open source
  - rolling release
  - linux
  - kernel
  - hardening
  - roadmap
---

## where we've been, where we're going

acreetionos has been moving fast. the core distro is stable, the package repos are growing, and we've been hardening the default install against the kind of supply chain and memory-safety vulnerabilities that keep showing up across the linux ecosystem. here's what we shipped recently and what's on the board for the next few months.

## supply chain hardening after CVE-2024-3094

the xz backdoor incident earlier this year changed how we think about build pipelines. for anyone living under a rock: CVE-2024-3094 was a multi-year social engineering attack that planted a remote code execution backdoor into xz-utils 5.6.0 and 5.6.1 via compromised build scripts in the release tarballs. the backdoor intercepted RSA_public_decrypt calls in sshd to bypass authentication. it was caught by sheer luck — a postgres developer noticed sshd was 500ms slower than normal.

acreetionos was never vulnerable because we build xz directly from git sources, not the compromised release tarballs. but we took it as a wake-up call. we've since implemented SBOM generation for every package in the repo and added tarball-vs-git integrity checks to our CI pipeline:

```bash
# acreetionos package build now runs this
diff -r <(git archive HEAD) <(tar -xzf release.tar.gz) || {
    echo "FATAL: release tarball differs from git source"
    exit 1
}
```

we're also working on deterministic builds for all core packages so anyone can reproduce byte-for-byte identical binaries and verify nothing's been tampered with.

## kernel hardening and the regreSSHion panic

CVE-2024-6387 (the OpenSSH "regreSSHion") was a signal handler race condition in sshd that enabled unauthenticated remote code execution as root on glibc-based systems. it was a regression of CVE-2006-5051, reintroduced in 2020. acreetionos patched immediately with openssh 9.8p1, but this particular CVE exposed how fragile the interaction between sshd's privilege separation and glibc's async-signal-unsafe functions really is.

our roadmap includes a default `sshd_config` hardening profile that ships with:

```
LoginGraceTime 30
MaxAuthTries 3
MaxStartups 10:30:100
PasswordAuthentication no
PermitRootLogin prohibit-password
ClientAliveInterval 60
ClientAliveCountMax 2
```

these aren't silver bullets — nothing stops a race condition in the signal handler itself — but defense in depth matters. we're also evaluating moving the default sshd to `rsync`-style privilege separation (which would make the regreSSHion attack vector impossible) and tracking the OpenBSD community's ongoing work around this class of bug.

## what's on the board

here's what we're hacking on next:

- **glibc 2.40 rebase and CVE-2024-2961 patch integration**: the iconv() buffer overflow in ISO-2022-CN-EXT conversion could let attackers overwrite adjacent heap memory. we're tracking upstream's fix and backporting to our current glibc build while the rebase stabilizes.
- **immutable root by default**: overlayfs-based read-only root filesystem with persistent state carved into `/var` and `/etc` as writable overlays. this makes a ton of persistence attacks impossible — if you can't write to `/usr/bin`, you can't drop a rootkit there no matter what CVE you exploit.
- **kernel lockdown in LSM**: enabling `lockdown=integrity` in the default kernel config. once loaded, the kernel will refuse to modify itself at runtime — no unsigned kernel module loading, no `/dev/mem` access, no kexec. this kills a whole class of post-exploitation techniques.
- **acreetionos package portal**: a web frontend for browsing the repo, seeing package CVEs, checking SBOM data, and verifying reproducible build hashes. open source and libre, obviously. we're building it in rust with axum because why not.

## the bigger picture

the linux security landscape right now is a constant churn of new CVEs — glibc heap overflows, ssh race conditions, kernel privilege escalations, supply chain implants. a rolling release distro can't just ship fast; it has to ship *aware*. every package update is a chance to audit, harden, and improve defaults.

acreetionos isn't about being the most secure distro. it's about being the one where security decisions happen in the open, build artifacts are verifiable, and the gap between upstream CVE disclosure and user patch is measured in hours, not weeks. if that sounds like your kind of project, the repo's at [acreetionos.org](https://acreetionos.org) and we'd love more eyes on the build pipeline.

clone it, break it, tell us what's wrong. that's how this gets better. uwu
