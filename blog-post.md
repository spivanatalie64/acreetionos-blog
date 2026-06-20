TITLE: Hardening AcreetionOS Against Real-World Kernel and Userspace Exploits: A Hands-On Guide
DESCRIPTION: Practical kernel hardening, SSH lockdown, and vulnerability mitigation for AcreetionOS (Arch-based) — covering CVE-2024-6387, CVE-2024-1086, and the xz backdoor.
TAGS: acreetionos, arch linux, security, hardening, CVE, kernel, ssh, linux, tutorial, sysadmin
CONTENT:

# Hardening AcreetionOS Against Real-World Kernel and Userspace Exploits: A Hands-On Guide

If you run AcreetionOS — or any Arch-based distro — you're already in a better spot than most. Rolling release means you get patches fast. But "fast" and "enough" are two different things. The last couple of years have been brutal for Linux security. We saw a supply-chain backdoor that almost shipped to every major distro, a kernel use-after-free that gave unprivileged users root in seconds, and a regression in OpenSSH that brought back a 2006-era remote code execution bug. If you're running AcreetionOS as a daily driver — especially on anything that touches the internet — you need more than just `pacman -Syu`. You need a real hardening workflow.

Let's walk through it. I'm writing this from my own AcreetionOS machine running the `linux-hardened` kernel. Every command here is copy-pasteable. Everything references real CVEs. No fluff.

---

## 1. Start with the hardened kernel — and know why

The default `linux` kernel on AcreetionOS (currently tracking upstream 6.12.x) is solid, but it ships with a generic config that leaves a lot of attack surface exposed. The `linux-hardened` package applies the Kernel Self Protection Project (KSPP) patchset plus additional grsecurity-inspired defaults. If you were paying attention to **CVE-2024-1086** — the `nf_tables` use-after-free that gave local privilege escalation on kernels 5.14 through 6.6 — you'll remember that the exploit worked because of slab merging and missing `CONFIG_INIT_ON_ALLOC_DEFAULT_ON`. The hardened kernel enables that by default.

```bash
# Install the hardened kernel
sudo pacman -S linux-hardened linux-hardened-headers

# Regenerate your bootloader config (assuming GRUB)
sudo grub-mkconfig -o /boot/grub/grub.cfg

# Reboot into it, then verify
uname -r
# Should show something like: 6.12.x-hardened1-1-hardened
```

After rebooting, check that hardening features are actually active:

```bash
# Verify kernel self-protection features
cat /sys/kernel/security/lsm
# Should include: lockdown,capability,yama,landlock,bpf

# Check that init_on_alloc is enabled (prevents info leaks + heap spray)
cat /proc/cmdline | grep init_on_alloc=1

# Verify PTI is on (mitigates Meltdown-class attacks, even on AMD)
cat /sys/devices/system/cpu/vulnerabilities/meltdown
```

The hardened kernel also sets `CONFIG_SLAB_MERGE_DEFAULT=n`, which is the specific knob that would have broken the CVE-2024-1086 exploit chain. It's not magic — you're paying a small performance cost (usually 2-5% on desktop workloads) — but for anything that runs a browser, opens email attachments, or faces the network, it's worth it.

---

## 2. Lock down SSH — CVE-2024-6387 (regreSSHion) changed the threat model

**CVE-2024-6387** was a disaster. A signal handler race condition in `sshd` (OpenSSH versions 8.5p1 through 9.7p1, plus really old 4.x versions) let unauthenticated attackers achieve remote code execution as root. The Qualys research team demonstrated it takes about 10,000 connection attempts on average — which, on a 32-bit system, is roughly 6-8 hours. On 64-bit, harder but still within reach for a determined attacker. The patch shipped in OpenSSH 9.8p1, which AcreetionOS/Arch pushed out within hours. But patching the binary isn't enough — you need to make sure your SSH config actually protects you against the next one.

Here's my recommended `sshd_config` for AcreetionOS. This isn't a "paranoid" config — it's what I run on every machine, including desktops, because SSH is often left listening by default on Arch-based installs:

```bash
sudo nano /etc/ssh/sshd_config
```

```
# --- AcreetionOS hardened sshd config ---
# Only allow key-based auth. Passwords are a liability.
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no

# Disable unused features that add attack surface
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no

# Rate-limit unauthenticated connections (mitigates brute-force
# and race-condition attacks like CVE-2024-6387)
MaxStartups 10:30:100
LoginGraceTime 30
MaxAuthTries 3
MaxSessions 4

# Protocol and crypto hygiene
Protocol 2
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# Only users who actually need SSH
AllowUsers yourusername
```

```bash
# Validate the config before restarting
sudo sshd -t

# If validation passes, restart
sudo systemctl restart sshd

# Verify the daemon is actually running the version with the CVE fix
sshd -V 2>&1 | head -1
# Should show: OpenSSH_9.8p1 or newer
```

One more thing: if you don't need SSH at all — and on a desktop, you probably don't — just disable the socket:

```bash
sudo systemctl disable --now sshd.socket sshd.service
```

No listening service, no attack surface. Simple.

---

## 3. Userspace hardening that actually matters

Not every CVE is a kernel bug. The **xz backdoor (CVE-2024-3094)** was a multi-year supply-chain attack where a malicious maintainer, "Jia Tan," inserted an obfuscated backdoor into `liblzma` versions 5.6.0 and 5.6.1. The backdoor hooked into `sshd` via `libsystemd` and would have given the attacker remote code execution through a compromised Ed448 signature check. AcreetionOS never shipped the backdoored versions — Arch caught it before it hit the stable repos — but the lesson is permanent: you cannot trust upstream blindly. You need runtime visibility.

Here are three practical things you can do on AcreetionOS today:

### AppArmor profiles for high-risk services

AcreetionOS ships with AppArmor available. Enable it and confine the services that face the network:

```bash
# Install and enable AppArmor
sudo pacman -S apparmor
sudo systemctl enable --now apparmor

# Check that it loaded correctly
sudo aa-status

# Install some pre-built profiles
sudo pacman -S apparmor-profiles
```

For a quick win, put Firefox (or whatever browser you run) in enforce mode. Browsers parse untrusted content constantly — they're the single biggest attack surface on any desktop:

```bash
# Enable the Firefox AppArmor profile if it exists
sudo aa-enforce /etc/apparmor.d/usr.bin.firefox 2>/dev/null || echo "No profile found — consider creating one"
```

### Audit what's listening

Most people have no idea what services are bound to ports on their own machine. That's terrifying:

```bash
# Show all listening TCP/UDP sockets with the owning process
sudo ss -tulpn

# If you see anything listening on 0.0.0.0 or ::: that you don't recognize,
# investigate immediately. On a desktop, the answer is usually "nothing."
```

### Regularly audit installed packages against CVEs

Arch's security tracker is at [security.archlinux.org](https://security.archlinux.org). Bookmark it. Also, `arch-audit` gives you a local CVE scan:

```bash
# Install arch-audit (AUR package)
# If you use yay or paru:
paru -S arch-audit

# Scan your installed packages against the CVE database
arch-audit

# If you see anything flagged as "High" or "Critical," update immediately.
# On a rolling distro, this should almost never happen if you update daily.
```

---

## 4. Build the habit: weekly updates are not optional

I know people who treat `pacman -Syu` like a chore they'll get to "sometime this week." On a rolling-release distro tracking upstream Arch, that is how you get owned. The window between a CVE being disclosed and an exploit appearing in the wild is shrinking. For CVE-2024-6387, public PoCs were available within 48 hours of the Qualys advisory.

Here's what I do. It takes two minutes:

```bash
# Full system update
sudo pacman -Syu

# Check for .pacnew files (config files that need manual merging)
sudo pacdiff

# Reboot if the kernel or systemd updated
# (check with: ls -l /boot/vmlinuz-* /usr/lib/systemd/systemd | grep "$(date +%b\ %e)")
```

If you want to automate the notification part (never auto-apply updates — that's how you break a rolling system at 3 AM):

```bash
# Create a simple systemd timer to check for updates daily
sudo tee /etc/systemd/system/pacman-check.timer << 'EOF'
[Unit]
Description=Daily check for available Arch updates

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo tee /etc/systemd/system/pacman-check.service << 'EOF'
[Unit]
Description=Check for available updates

[Service]
Type=oneshot
ExecStart=/usr/bin/pacman -Sy
ExecStartPost=/usr/bin/bash -c 'pacman -Qu | wc -l | xargs -I{} echo "{} updates available"'
EOF

sudo systemctl enable --now pacman-check.timer
```

Then check `journalctl -u pacman-check.service` whenever you feel like it. Or just run `pacman -Syu` every Sunday morning with coffee. Either way.

---

## 5. The bottom line

AcreetionOS gives you the foundation. You get a lightweight, Cinnamon-based Arch system that updates fast, doesn't ship bloat, and respects your freedom. But no distro can make security decisions for you. The difference between a machine that survives the next CVE-2024-6387 and a machine that gets popped is a handful of config changes that take less than an hour to set up once.

Switch to `linux-hardened`. Lock down SSH. Enable AppArmor. Audit your listening ports. Update weekly. That's it. That's the whole playbook.

If you want to go deeper, the [Arch Security Tracker](https://security.archlinux.org) and the [KSPP documentation](https://kernsec.org/wiki/index.php/Kernel_Self_Protection_Project) are your next stops. And if you're on AcreetionOS and you've got hardening tips of your own, drop by the [acreetionos.org](https://acreetionos.org) forums and share them. The whole point of open source is that we figure this stuff out together.

Stay safe out there. ✌️
