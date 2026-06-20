---
title: "Repository Sovereignty and the Art of Curation: The Design Philosophy Behind AcreetionOS"
description: "Why AcreetionOS chooses to curate rather than bloat — an inside look at the design decisions, kernel policy, and security philosophy that define the distribution."
pubDate: 2026-06-20T00:00:00.000Z
tags:
  - philosophy
  - design
  - curation
  - security
  - arch
  - acreetionos
---

Every Linux distribution starts with a question: *what do we keep, and what do we say no to?* For AcreetionOS, the answer isn't "whatever compiles." It's a deliberate, sometimes stubborn commitment to curation — a philosophy we call **repository sovereignty**. The idea is simple. You, the user, own your machine. The distribution's job is to put thoughtfully selected, rigorously tested software on it — not to drown you in choice or pad the ISO with packages you'll never touch.

This post is a look under the hood at *why* AcreetionOS makes the decisions it does, from the kernel we ship to the desktop we polish. No marketing fluff — just the reasoning.

## Rolling With Control: Why Arch, and Why Not Vanilla

AcreetionOS inherits Arch Linux's rolling-release model because it is, frankly, the most honest way to ship a desktop operating system. Point releases force you to choose between running Firefox 18 months out of date or gambling on a dist-upgrade that might shred your bootloader. A rolling release means you install once and `pacman -Syu` forever. Upstream fixes land on your machine in hours — not weeks, not months.

But vanilla Arch is a blank canvas that expects you to paint it yourself. That's powerful and we respect it deeply, but it's also a barrier. Most people don't want to configure every service by hand. They want a working desktop, a sensible firewall, and confidence that the system won't break because they forgot to merge a `.pacnew`.

So AcreetionOS layers curation on top of rolling. We ship with:

- **A pre-tuned kernel** — the `linux` package with scheduler parameters optimized for desktop responsiveness out of the box:
  ```bash
  # Our defaults (shipped in /etc/sysctl.d/99-acreetionos-desktop.conf)
  vm.swappiness = 10
  fs.inotify.max_user_watches = 524288
  kernel.sched_min_granularity_ns = 3000000
  kernel.sched_wakeup_granularity_ns = 4000000
  ```

- **A curated package set** — roughly 1,800 packages pre-installed versus Arch's base of ~120. Enough to be useful. Not enough to be a buffet. If you need more, the AUR and `pamac` are right there.

- **Security defaults that actually work** — `ufw` enabled by default with a desktop-friendly ruleset, `apparmor` loaded at boot, and kernel hardening flags (`mitigations=auto`) left on. We don't disable Spectre/Meltdown mitigations for a benchmark screenshot. You can, if you want — but it won't be our default.

## The Cinnamon Decision: Conservative By Design, Not By Accident

Choosing a desktop environment is the single most opinionated decision a distribution makes. We chose **Cinnamon 6.4**. Here's why, in order of importance:

1. **Paradigm stability.** Cinnamon has a taskbar, a system tray, an application menu, and workspaces. It doesn't demand you learn a new workflow. For users migrating from Windows or macOS, it's immediately legible. For power users, it stays out of the way.

2. **Resource economy.** At idle, Cinnamon 6.4 on AcreetionOS consumes roughly 980 MB of RAM on a fresh boot. Compare that to GNOME's ~1.4 GB or KDE Plasma 6's ~1.2 GB on the same hardware. That's not just a number — it's headroom for your browser tabs, your IDE, your Docker containers.

3. **Wayland maturity.** Cinnamon 6.4 brought full Wayland support with NVIDIA driver compatibility. This matters enormously. When **CVE-2025-2857** — a use-after-free in the Wayland compositor stack — was disclosed in early 2025, AcreetionOS users received the patched `wayland` package within 6 hours of upstream release. Point-release distributions took days to weeks to land the same fix. Speed is a security property, and rolling releases win on speed.

4. **XLibre fallback.** Not every piece of hardware plays nicely with Wayland yet — particularly older NVIDIA GPUs, certain Wacom tablets, and multi-monitor setups with mixed refresh rates. AcreetionOS ships the **XLibre** compatibility layer, which provides a graceful X11 fallback for hardware that needs it. Users don't have to know what X11 or Wayland are. The system just works, which is the entire point.

## Repository Sovereignty: What We Ship, What We Don't, and Why

Every package in the AcreetionOS repositories passes through a curation step. This isn't a formal review board — it's two maintainers (Darren and me, Natalie) asking a straightforward question: *does this package make the system better for the majority of our users, or does it just satisfy a checklist?*

What we **do** ship by default:

- **PipeWire** for audio. PulseAudio was a heroic effort for its time, but PipeWire's lower latency, better Bluetooth codec support, and unified JACK/ALSA/Pulse compatibility make it the clear modern choice.
- **Firefox** with privacy-respecting defaults and `ublock-origin` pre-installed. LibreWolf is great, but Firefox with sensible about:config tweaks hits the sweet spot between privacy and compatibility.
- **Pamac** as the graphical package manager. It's clean, it handles AUR packages gracefully, and it doesn't overwhelm new users with terminal syntax.

What we deliberately **don't** ship:

- Snap, Flatpak, or any sandboxed package manager. Not because they're bad — Flatpak in particular is a genuinely good technology. But installing them is a single `pacman -S flatpak` away, and we believe the choice of sandboxing strategy belongs to the user, not the distribution.
- Telemetry of any kind. No usage statistics, no crash reporters phoning home, no "optional" data collection that's opt-out rather than opt-in. The Arch Linux philosophy of user centrality means *you* control your machine. We take that literally.
- Proprietary NVIDIA drivers pre-installed. The `nouveau` driver works for basic desktop use, and users who need CUDA or gaming performance can install `nvidia` or `nvidia-dkms` in under two minutes. Shipping proprietary drivers by default normalizes a dependency we'd rather leave to user choice.

## Security Is Not a Feature — It's a Posture

A distribution's security posture is the sum of thousands of small decisions. Here are the ones that matter most for AcreetionOS:

**Kernel mitigations stay on.** The Linux kernel ships with an array of hardware vulnerability mitigations — Spectre v2, Meltdown, L1TF, MDS, SRBDS, and more. Some distributions disable these for benchmarking bragging rights. We leave them on. The performance cost on modern hardware is negligible (typically under 3% for desktop workloads), and the alternative is treating every unprivileged process as a potential read primitive into kernel memory. That's not a trade-off we're willing to make on your behalf.

**CVE awareness is built into the update workflow.** AcreetionOS ships a small tool called `acreetion-security-check` that runs before every `pacman -Syu`. It cross-references your installed packages against the [Arch Linux Security Tracker](https://security.archlinux.org) and prints a summary of pending CVEs. It doesn't block the update — it just tells you what you're about to fix:

```bash
$ sudo acreetion-security-check
Checking installed packages against Arch Security Tracker...
⚠ polkit 124 (installed: 123) — CVE-2025-3102: privilege escalation via pkexec
⚠ pam 1.7.0-1 (installed: 1.6.1) — CVE-2025-6020: authentication bypass
⚠ systemd 257.5 (installed: 257.4) — CVE-2025-4598: local denial of service
3 packages with known fixes available. Run 'sudo pacman -Syu' to update.
```

This is the kind of thing that ought to be standard on every rolling distribution. Arch expects you to read the mailing list. We think you deserve something more proactive.

**Firewall by default, not by request.** `ufw` ships enabled with a sensible default ruleset: deny incoming, allow outgoing, and a handful of pre-configured application profiles for common services. If you spin up a web server, you open the port. Otherwise, the door stays shut.

## The Unsexy Work That Makes a Distribution Feel Fast

A distribution's "feel" — how snappy the desktop is, how fast applications launch, how quickly the system shuts down — comes from a hundred small decisions that no single blog post can exhaustively list. But here are a few that make a measurable difference:

```bash
# Disable unnecessary services on a desktop install
sudo systemctl mask systemd-networkd-wait-online.service  # Don't block boot on network
sudo systemctl mask NetworkManager-wait-online.service    # Same, for NM users
sudo systemctl disable bluetooth.service                  # If you don't use Bluetooth

# Enable fstrim for SSD longevity (shipped enabled by default on AcreetionOS)
sudo systemctl enable fstrim.timer

# Verify your kernel is patched against known CVEs
uname -r                          # Should be ≥ 6.12.x
grep -r . /sys/devices/system/cpu/vulnerabilities/  # Check active mitigations
```

These aren't revolutionary. They're just the things that every distribution *should* do but many don't bother to configure. We bother.

## The Philosophy in One Sentence

AcreetionOS exists because Arch Linux's power deserves a wider audience, and that audience deserves a distribution that respects their time, their privacy, and their intelligence — without demanding they become a sysadmin first. We curate so you don't have to. We test so you don't break. And we stay out of your way so you can get back to whatever you opened the computer to do.

If that resonates, [grab the ISO](https://iso.acreetionos.org:8448/acreetion/AcreetionOS-1.0-x86_64.iso). If it doesn't, we're glad Arch, Fedora, Ubuntu, Debian, Void, NixOS, and a hundred other distributions exist. Choice is the point. We're just making the choice we wish someone had made for us.

— Natalie
