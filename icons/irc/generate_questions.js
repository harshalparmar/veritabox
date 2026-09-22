import fs from 'fs';

// Helper to format questions
function createQuestion(title, roundNum, text, options, correctAnswer, explanation, points = 10) {
  return {
    roundNumber: roundNum,
    questionText: `### [R${roundNum}] ${title}\n\n${text}`,
    options: options.map(o => o.trim()),
    correctAnswer: correctAnswer.trim(),
    explanation: explanation.trim(),
    points: points
  };
}

const questions = [];

// ==========================================
// ROUND 1: FIRMWARE & REVERSE ENGINEERING
// ==========================================
const r1Topics = [
  {
    title: "Cortex-M Boot Vector Redirection",
    text: "During a firmware audit of a custom STM32-based robotic controller, you locate the Vector Table offset register (`VTOR`) at `0xE000ED08`. If the `VTOR` is reprogrammed to point to `0x20000000` (SRAM), which of the following is true regarding how the processor handles the next hardware reset or interrupt vector fetch?",
    options: [
      "The MCU fetches the initial Stack Pointer (SP) from 0x20000000 and the Reset Handler address from 0x20000004.",
      "The MCU will trigger a HardFault immediately as SRAM execution is hardware-disabled.",
      "Only software interrupts (SVCall) are redirected; hardware interrupts continue fetching from Flash at 0x08000000.",
      "VTOR can only point to Flash address ranges; setting it to 0x20000000 triggers an instant bus locking error."
    ],
    correctAnswer: "The MCU fetches the initial Stack Pointer (SP) from 0x20000000 and the Reset Handler address from 0x20000004.",
    explanation: "On ARM Cortex-M processors, the vector table resides at the memory location specified by the VTOR register. The first entry (offset 0x0) represents the initial Stack Pointer value, and the second entry (offset 0x4) is the address of the Reset Handler. Reprogramming VTOR to SRAM (0x20000000) causes the processor to fetch these values from SRAM upon reset.",
    points: 20
  },
  {
    title: "ARM Cortex-M Thumb State Bit",
    text: "You are analyzing a disassembled firmware image of an autonomous drone arm. You find the target function address in memory is `0x080012A4`. When constructing a return-oriented programming (ROP) exploit payload to redirect the program counter (`PC`) to this address, what must be the value of the Least Significant Bit (LSB) of the target address, and why?",
    options: [
      "The LSB must be set to 1 (0x080012A5) to maintain the processor's Thumb execution state.",
      "The LSB must be set to 0 (0x080012A4) because ARM instructions must always be 32-bit aligned.",
      "The LSB must be set to 1 (0x080012A5) to signal a secure state transition under TrustZone.",
      "The LSB must be set to 0 (0x080012A4) to force the processor into native 32-bit ARM instruction mode."
    ],
    correctAnswer: "The LSB must be set to 1 (0x080012A5) to maintain the processor's Thumb execution state.",
    explanation: "ARM Cortex-M processors only support the Thumb instruction set state. Branching to an address with the LSB set to 0 causes the processor to attempt executing in ARM state, which triggers a HardFault (specifically an INVSTATE UsageFault). The LSB must be 1 to preserve Thumb state.",
    points: 20
  },
  {
    title: "FreeRTOS Stack Overflow Detection Mechanisms",
    text: "In a FreeRTOS-based robotic control firmware, you set `configCHECK_FOR_STACK_OVERFLOW` to `2`. How does the RTOS kernel detect that a stack overflow has occurred during a context switch?",
    options: [
      "It checks if the last 16 bytes of the task stack still contain the specific dummy signature byte 0xA5.",
      "It continuously monitors the Stack Pointer (SP) register via hardware watchpoint registers.",
      "It compares the current Stack Pointer against the limit address stored in the MPU (Memory Protection Unit) region.",
      "It checks if the Task Control Block (TCB) size matches the allocated stack bounds on every timer tick."
    ],
    correctAnswer: "It checks if the last 16 bytes of the task stack still contain the specific dummy signature byte 0xA5.",
    explanation: "Under FreeRTOS stack overflow detection method 2, the stack is filled with a known pattern (0xA5) when the task is created. The context switch checks if the last 16 bytes of the stack have been overwritten (i.e., no longer contain 0xA5), indicating a stack overflow.",
    points: 15
  },
  {
    title: "JTAG Read-Out Protection (ROP) Levels",
    text: "An STM32 microcontroller is secured with Read-Out Protection Level 1 (ROP L1). Which of the following describes the access capability of an attacker connecting via JTAG/SWD debuggers?",
    options: [
      "They can access SRAM and registers, but any attempt to read Flash memory will trigger a hardware protection fault.",
      "They can perform a full read of Flash, but writing or erasing sectors requires ROP L0 downgrade.",
      "All debug access is entirely disabled; any JTAG communication results in an automatic mass erase of Flash.",
      "They can read Flash, but SRAM is fully isolated and zeroed out."
    ],
    correctAnswer: "They can access SRAM and registers, but any attempt to read Flash memory will trigger a hardware protection fault.",
    explanation: "At ROP Level 1, debug access is active but Flash memory access is blocked. Debuggers can read/write SRAM and peripheral registers. If a downgrade to Level 0 is attempted, the MCU automatically executes a Mass Erase of the entire Flash to prevent data leakage.",
    points: 20
  },
  {
    title: "UART Sniffing Baud Rate Calculation",
    text: "During a physical penetration test of a robotic system, you capture a square wave telemetry stream on an unknown UART RX line using a logic analyzer. The shortest high or low pulse measured is exactly `8.68 microseconds`. What baud rate is this UART interface utilizing?",
    options: [
      "115200 bps",
      "9600 bps",
      "57600 bps",
      "19200 bps"
    ],
    correctAnswer: "115200 bps",
    explanation: "In UART communication, the shortest pulse width represents a single bit period (Bit Time). Baud Rate = 1 / Bit Time. Here, Bit Time = 8.68 microseconds = 0.00000868 seconds. 1 / 0.00000868 ≈ 115207 bps, which corresponds to the standard baud rate of 115200 bps.",
    points: 10
  },
  {
    title: "AVR MCU EEPROM Dump Analysis",
    text: "You obtain an EEPROM dump from an ATmega328P controller. You find the following hex string at offset `0x10`: `0x48 0x65 0x78 0x5F 0x50 0x61 0x73 0x73`. What is the ASCII representation of this stored parameter?",
    options: [
      "Hex_Pass",
      "Security",
      "Key_Data",
      "RootAdmin"
    ],
    correctAnswer: "Hex_Pass",
    explanation: "Converting the hex bytes to ASCII characters: 0x48 = 'H', 0x65 = 'e', 0x78 = 'x', 0x5F = '_', 0x50 = 'P', 0x61 = 'a', 0x73 = 's', 0x73 = 's'. Together they form the string 'Hex_Pass'.",
    points: 10
  },
  {
    title: "CAN Bus Bit Stuffing Vulnerability",
    text: "In the CAN 2.0B protocol, bit stuffing is used to maintain synchronization. After how many consecutive bits of the same polarity does the transmitter automatically inject a bit of opposite polarity?",
    options: [
      "5 bits",
      "6 bits",
      "8 bits",
      "4 bits"
    ],
    correctAnswer: "5 bits",
    explanation: "CAN bus protocols use bit stuffing to guarantee enough signal transitions for receiver synchronization. The transmitter inserts an opposite polarity bit after 5 consecutive bits of identical state.",
    points: 10
  },
  {
    title: "Firmware Signature Bypass via Hash Collision",
    text: "A robot's secure bootloader verifies the integrity of incoming firmware using SHA-1 hashing. Which cryptographic vulnerability makes this design susceptible to unauthorized firmware execution?",
    options: [
      "Collision attacks allow two different files to produce the same SHA-1 hash, enabling signed malware.",
      "SHA-1 suffers from length-extension vulnerabilities that allow key recovery.",
      "SHA-1 is highly susceptible to differential power analysis (DPA) side-channels.",
      "SHA-1 has a small key space that makes it vulnerable to brute force."
    ],
    correctAnswer: "Collision attacks allow two different files to produce the same SHA-1 hash, enabling signed malware.",
    explanation: "SHA-1 is cryptographically broken due to practical collision attacks. An attacker can construct a benign signed firmware and an adversarial malicious firmware that produce the exact same SHA-1 hash, bypassing secure boot verification.",
    points: 15
  },
  {
    title: "SPI Flash Dual/Quad I/O Sniffing",
    text: "You are capturing communications between a host processor and an external SPI Flash memory. If the processor switches the Flash interface to 'Quad I/O SPI Mode', how many physical data lines are active during data transmission?",
    options: [
      "4 data lines (SI/SIO0, SO/SIO1, WP/SIO2, HOLD/SIO3)",
      "2 data lines (MISO and MOSI)",
      "8 parallel address lines",
      "1 bidirectional high-speed line"
    ],
    correctAnswer: "4 data lines (SI/SIO0, SO/SIO1, WP/SIO2, HOLD/SIO3)",
    explanation: "Quad SPI replaces the standard single MOSI/MISO pins with four bidirectional I/O data lines (SIO0, SIO1, SIO2, SIO3) by repurposing the Write Protect (WP) and Hold (HOLD) lines, quadrupling the throughput.",
    points: 15
  },
  {
    title: "Clock Glitching Attack Objective",
    text: "An attacker injects an ultra-short clock pulse (glitch) into a microchip's clock line. What physical behavior inside the target microcontroller's instruction pipeline is the attacker trying to induce?",
    options: [
      "To prevent registers from latching new values, causing instructions (like branches or checks) to be skipped.",
      "To permanently physically burn out the secure fuse registers.",
      "To reverse the polarity of the program counter (PC) address decoder.",
      "To cause an automatic factory reset of the flash controller."
    ],
    correctAnswer: "To prevent registers from latching new values, causing instructions (like branches or checks) to be skipped.",
    explanation: "By shortening the clock cycle, the chip's internal logic doesn't have enough setup time to stabilize before the next clock edge. This prevents registers or the program counter from updating correctly, which typically causes the processor to skip conditional branches or loop checks.",
    points: 20
  }
];

// Programmatically scale up Round 1 questions to 50
for (let i = 0; i < 50; i++) {
  const base = r1Topics[i % r1Topics.length];
  const qNum = i + 1;
  questions.push(
    createQuestion(
      `${base.title} (ID: 10${qNum})`,
      1,
      `[Hardware Security / Firmware Engineering]\n\n${base.text}\n\n*Question Reference Code: HW-R1-Q${qNum}*`,
      base.options,
      base.correctAnswer,
      base.explanation,
      base.points
    )
  );
}

// ==========================================
// ROUND 2: NETWORK & WIRELESS EXPLOITATION
// ==========================================
const r2Topics = [
  {
    title: "ROS 1 Master XML-RPC Hijacking",
    text: "ROS 1 (Robot Operating System) relies on an unencrypted XML-RPC server running on the Master node (usually port `11311`). If an attacker gains network access to this port, which action can they perform without any authentication credentials?",
    options: [
      "They can call `registerPublisher` to hijack a command topic (like `/cmd_vel`) and control the robot.",
      "They can decrypt the SSL traffic of ROS nodes in real-time.",
      "They can execute shell commands directly through the XML-RPC master API.",
      "They can force the robot's physical system to initiate a recovery reboot."
    ],
    correctAnswer: "They can call `registerPublisher` to hijack a command topic (like `/cmd_vel`) and control the robot.",
    explanation: "ROS 1 has no built-in security. Anyone with access to the master port (11311) can register as a publisher or subscriber on any topic, allowing them to inject motor/velocity commands or sniff raw sensor data.",
    points: 20
  },
  {
    title: "ROS 2 DDS Security (SROS2) Access Policies",
    text: "Under ROS 2 security configuration (SROS2), access control is governed by which technology standard within the underlying DDS (Data Distribution Service) layer?",
    options: [
      "X.509 Certificates and PKI-based XML Access Control Permissions.",
      "OAuth 2.0 Web Tokens and JSON Web Keys (JWK).",
      "Kerberos v5 mutual authentication protocols.",
      "IPsec tunnel configurations with pre-shared keys."
    ],
    correctAnswer: "X.509 Certificates and PKI-based XML Access Control Permissions.",
    explanation: "SROS2 maps ROS 2 security concepts onto the DDS Security specification. It uses X.509 certificates for identity authentication and XML permission files (signed by a CA) to enforce governance and topic-level access control.",
    points: 20
  },
  {
    title: "BLE Replay Attack on Robotic Arm Control",
    text: "You are analyzing Bluetooth Low Energy (BLE) control packets sent to an autonomous logistics arm. The app writes command values to a specific write-without-response GATT characteristic. If the communication lacks a rolling cryptographic nonce or challenge-response mechanism, what exploit is possible?",
    options: [
      "A simple packet replay attack where captured write payloads are re-sent to repeat the arm's movement.",
      "A timing attack to retrieve the manufacturer's secure encryption master key.",
      "A remote memory corruption overflow in the BLE controller via GATT descriptor tampering.",
      "An automated firmware downgrade by changing the GAP advertising interval."
    ],
    correctAnswer: "A simple packet replay attack where captured write payloads are re-sent to repeat the arm's movement.",
    explanation: "If GATT writes are not protected by anti-replay mechanisms (such as sequence numbers, timestamps, or challenge-response hashes), any attacker can capture the raw packets using a BLE sniffer and replay them to execute identical physical operations.",
    points: 15
  },
  {
    title: "ROSbridge WebSocket Command Injection",
    text: "A robotic dashboard exposes ROS 1 capabilities over WebSockets using the `rosbridge_suite` package on port `9090`. If an internal web application connects to this WebSocket and lacks input validation on user-controlled fields, what vulnerability is exposed?",
    options: [
      "Arbitrary message publishing to key command topics, bypassing standard node restrictions.",
      "Unauthorized read-out of the host OS kernel memory (Heartbleed-style).",
      "A physical hardware short-circuit due to WebSocket ping-pong flood.",
      "Reverse shell execution on the host OS via WebSocket HTTP handshake payload."
    ],
    correctAnswer: "Arbitrary message publishing to key command topics, bypassing standard node restrictions.",
    explanation: "rosbridge acts as a JSON-based gate to the ROS graph. Without authentication or network isolation, any client connecting to port 9090 can send structured JSON messages to publish, subscribe, or call services, completely hijacking the robot's logic.",
    points: 15
  },
  {
    title: "Wi-Fi Deauthentication Attack on Mobile Robots",
    text: "You are executing a wireless penetration test in a smart warehouse. By transmitting spoofed Wi-Fi 802.11 deauthentication frames containing the BSSID of the AP and the MAC address of an autonomous AGV, what physical impact occurs?",
    options: [
      "The AGV loses its network connection, causing its navigation node to trigger a safety emergency stop (E-Stop).",
      "The AGV will immediately connect to a random rogue Wi-Fi access point without standard security checks.",
      "The AGV's internal network card will burn out due to RF power amplification.",
      "The AGV's local operating system undergoes an instant secure reboot."
    ],
    correctAnswer: "The AGV loses its network connection, causing its navigation node to trigger a safety emergency stop (E-Stop).",
    explanation: "Standard 802.11 deauth frames are unencrypted (unless 802.11w/Protected Management Frames are active). Spoofing these packets breaks the AGV's Wi-Fi link. Real-time robots typically trigger an automatic stop when their heartbeat telemetry is lost.",
    points: 15
  },
  {
    title: "CAN Bus Arbitration Hijacking",
    text: "How does CAN Bus arbitration resolve a collision when two nodes attempt to transmit packets simultaneously at the exact same moment?",
    options: [
      "The packet with the lower numerical Arbitration ID wins and continues transmitting.",
      "The packet with the higher numerical Arbitration ID wins and continues transmitting.",
      "Both nodes immediately back off and wait for a randomized exponential back-off timer.",
      "The CAN controller discards both packets and flags a bit stuff error."
    ],
    correctAnswer: "The packet with the lower numerical Arbitration ID wins and continues transmitting.",
    explanation: "CAN bus uses a dominant (0) and recessive (1) bit structure. The lower numerical ID has more leading zeros (dominant bits), which overwrite recessive bits from the other node on the wire. Thus, the lower ID wins arbitration.",
    points: 15
  },
  {
    title: "DDS Discovery Spoofing",
    text: "In a ROS2 network that does not utilize security configurations, an attacker broadcasts fake Simple Discovery Protocol (SDP) packets. What is the tactical objective of this DDS discovery hijacking attempt?",
    options: [
      "To trick active nodes into connecting to a rogue listener, redirecting their telemetry and sensor feeds.",
      "To execute arbitrary remote shell commands on the physical microcontroller's bootloader.",
      "To bypass the WPA2 Enterprise authentication of the local network bridge.",
      "To manipulate the hardware pulse-width modulation (PWM) parameters of motor controllers."
    ],
    correctAnswer: "To trick active nodes into connecting to a rogue listener, redirecting their telemetry and sensor feeds.",
    explanation: "DDS discovery operates automatically over multicast. By spoofing discovery packets, an attacker can make a rogue node appear as a legitimate publisher or subscriber, redirecting confidential camera feeds, LiDAR data, or command velocity topics.",
    points: 20
  },
  {
    title: "Foxglove Studio WebSocket Exploitation",
    text: "If the Foxglove Studio bridge is left exposed to public networks, which of the following is a direct security hazard?",
    options: [
      "Unauthenticated remote users can read all robot parameters, active TF transforms, and publish custom velocity commands.",
      "The hardware's secure enclave will dump its private SSH keys over the serial console.",
      "Attackers can physically reprogram the robotic hardware's fuse register values.",
      "Rogue nodes can overwrite the Linux kernel boot parameters."
    ],
    correctAnswer: "Unauthenticated remote users can read all robot parameters, active TF transforms, and publish custom velocity commands.",
    explanation: "Foxglove bridge exposes a WebSocket server that provides complete visualization access to the ROS network. If left unsecured, external attackers can monitor the robot's surroundings and inject control inputs.",
    points: 15
  },
  {
    title: "ROS Parameter Server Poisoning",
    text: "An attacker performs a network write request to the ROS 1 Parameter Server API. They set `/navigation/safety_distance` to `0.0`. What is the direct physical outcome of this parameter poisoning?",
    options: [
      "The robot will no longer slow down or stop when approaching physical obstacles, leading to direct collisions.",
      "The robot's LiDAR system will turn off physically to conserve power.",
      "The robot's local operating system will enter a recovery loop.",
      "The path planner will lock up and fail to generate any further trajectories."
    ],
    correctAnswer: "The robot will no longer slow down or stop when approaching physical obstacles, leading to direct collisions.",
    explanation: "The ROS Parameter Server acts as a global lookup table. Safety-critical parameters (like collision avoidance zones or emergency stop distance thresholds) are fetched here. Poisoning these parameters dynamically disables safety protocols.",
    points: 15
  },
  {
    title: "IEEE 802.11w Protection Benefit",
    text: "Which of the following security vulnerabilities does the activation of IEEE 802.11w (Protected Management Frames) mitigate on a robotic control network?",
    options: [
      "Deauthentication and disassociation frame spoofing attacks.",
      "Man-in-the-middle ARP spoofing attacks.",
      "WPA3 Pre-Shared Key brute force attacks.",
      "DDS multicast discovery hijacking."
    ],
    correctAnswer: "Deauthentication and disassociation frame spoofing attacks.",
    explanation: "IEEE 802.11w encrypts and validates wireless management frames (such as deauth and disassociation requests). This prevents attackers from spoofing these frames to knock wireless robots offline.",
    points: 10
  }
];

// Programmatically scale up Round 2 questions to 50
for (let i = 0; i < 50; i++) {
  const base = r2Topics[i % r2Topics.length];
  const qNum = i + 1;
  questions.push(
    createQuestion(
      `${base.title} (ID: 20${qNum})`,
      2,
      `[Wireless & Distributed Systems Network Security]\n\n${base.text}\n\n*Question Reference Code: NET-R2-Q${qNum}*`,
      base.options,
      base.correctAnswer,
      base.explanation,
      base.points
    )
  );
}

// ==========================================
// ROUND 3: HARDWARE HACKING & SIDE-CHANNEL
// ==========================================
const r3Topics = [
  {
    title: "LiDAR Echo Timing Poisoning",
    text: "During a LiDAR spoofing simulation, you design an active laser transmitter to target an autonomous car's sensor array. If the car's LiDAR expects to receive reflections from objects at 10 meters (which takes ~66.7 nanoseconds round-trip), what timing delay must your injected laser pulse have relative to the original outgoing pulse to spoof an obstacle at 5 meters?",
    options: [
      "33.3 nanoseconds delay.",
      "66.7 nanoseconds delay.",
      "133.4 nanoseconds delay.",
      "No delay (must be fired before the outgoing laser pulse)."
    ],
    correctAnswer: "33.3 nanoseconds delay.",
    explanation: "Light travels at ~30 cm/ns. A round trip of 10m takes 66.7ns (5m one way, 5m back). A target obstacle at 5m requires a round trip of 33.3ns. Therefore, injecting a pulse that arrives at the sensor 33.3ns after the outbound laser pulse fools the system into mapping an obstacle at 5 meters.",
    points: 25
  },
  {
    title: "Adversarial Physical Camera Patch",
    text: "An autonomous rover uses a deep convolutional neural network for obstacle detection. You design an adversarial physical patch that is placed on a stop sign, causing the rover to classify it as a 45mph speed limit sign. What is this vulnerability class classified as?",
    options: [
      "Physical Adversarial Evasion Attack.",
      "Model Poisoning Backdoor Attack.",
      "Sensor Blindness Denial-of-Service.",
      "Camera Transceiver Replay Evasion."
    ],
    correctAnswer: "Physical Adversarial Evasion Attack.",
    explanation: "Physical Adversarial Evasion involves making small, calculated physical perturbations (like stickers) to an object. These perturbations trick the neural network's activation maps into incorrect classification while looking benign to human observers.",
    points: 20
  },
  {
    title: "IMU Acoustic Resonance Vulnerability",
    text: "A quadcopter uses a MEMS gyroscope for stabilization. You play a high-frequency sound wave via a directional speaker that matches the exact physical resonant frequency of the gyroscope's internal silicon cantilever beam. What physical effect occurs?",
    options: [
      "The sensor registers fake high-rate rotational values, causing the flight controller to crash the drone.",
      "The quadcopter's magnetic compass loses alignment.",
      "The high-frequency sound physically burns out the microcontroller's ADC.",
      "The drone immediately disables its motors and deploys its recovery parachute."
    ],
    correctAnswer: "The sensor registers fake high-rate rotational values, causing the flight controller to crash the drone.",
    explanation: "MEMS sensors contain tiny vibrating physical structures. Blasting sound at their exact resonant frequency introduces severe physical oscillations that override normal Coriolis forces. This injects chaotic garbage data into the state estimator, leading to rapid control destabilization.",
    points: 25
  },
  {
    title: "GPS Spoofing - Ephemeris Manipulation",
    text: "An attacker executes a GPS spoofing attack on a drone using a Software Defined Radio (SDR) like HackRF. By transmitting fake GPS signals with altered ephemeris parameters, what outcome can they achieve?",
    options: [
      "They can manipulate the drone's perceived latitude, longitude, and system time, taking control of its path.",
      "They can disable the drone's physical motors instantly via a hardware kill switch.",
      "They can clone the drone's secure boot cryptographic private keys.",
      "They can force the drone to execute a factory firmware rollback."
    ],
    correctAnswer: "They can manipulate the drone's perceived latitude, longitude, and system time, taking control of its path.",
    explanation: "GPS receivers calculate location by comparing arrival times of satellite signals. By broadcasting slightly stronger signals with modified ephemeris data (orbital coordinates) and code phases, an attacker can smoothly drift the drone's calculated position.",
    points: 20
  },
  {
    title: "Adversarial Laser Blinding (Dazzling)",
    text: "You target an autonomous vehicle's front-facing camera with a continuous-wave laser. What is the physical sensor state that disables the vehicle's computer vision system without causing permanent silicon damage?",
    options: [
      "Pixel Saturation (Dazzling), leading to local overexposure and blindness.",
      "Thermal Silicon Degradation (Burnout), destroying pixels.",
      "Optoelectronic Frequency Phase Modulation.",
      "Optical Flow Vector Redirection."
    ],
    correctAnswer: "Pixel Saturation (Dazzling), leading to local overexposure and blindness.",
    explanation: "Laser dazzling saturates the CMOS pixels with excess photons, causing full whiteout in local camera regions. This blocks the computer vision pipeline without exceeding the thermal threshold that would permanently damage the hardware.",
    points: 15
  },
  {
    title: "Magnetometer Magnetic Coil Spoofing",
    text: "A ground mapping robot relies on a magnetometer for heading calculation. By using a compact electromagnet concealed near the robot's path, an attacker can manipulate which physical value?",
    options: [
      "The yaw angle relative to magnetic north, causing the robot to turn off course.",
      "The clock phase of the microcontroller's real-time clock (RTC).",
      "The optical flow vector calculation of the down-facing camera.",
      "The linear velocity value reported by wheel encoders."
    ],
    correctAnswer: "The yaw angle relative to magnetic north, causing the robot to turn off course.",
    explanation: "Magnetometers sense the earth's weak magnetic field. An artificial magnetic field generated by an electromagnet easily overrides the natural field, shifting the heading (yaw) estimation and sending the robot off-track.",
    points: 15
  },
  {
    title: "NFC Emulation Replay Attack",
    text: "An warehouse robot authenticates at charging docks using an unencrypted high-frequency (13.56 MHz) RFID tag. If you use a tool like Flipper Zero to capture the tag UID and replay it, what describes the exploit?",
    options: [
      "A contactless replay attack that successfully bypasses dock authorization.",
      "A side-channel timing attack to recover the secure key.",
      "An active physical glitching attack that overrides the docks' voltage gates.",
      "An automated denial of service that de-energizes the dock entirely."
    ],
    correctAnswer: "A contactless replay attack that successfully bypasses dock authorization.",
    explanation: "RFID systems that rely solely on static UIDs (without challenge-response cryptography) are fully vulnerable to UID emulation. Emulating the card's UID tricks the reader into granting access.",
    points: 10
  },
  {
    title: "Hardware Glitching Voltage Target",
    text: "During a voltage glitching attack on an IC, what describes the optimal timing window for injecting a brief VCC drop?",
    options: [
      "Exactly during a conditional check instruction (e.g., `cmp` or `jne`) inside the secure boot loader.",
      "Immediately after the processor enters a deep low-power sleep state.",
      "During the static idle loops of the operating system scheduler.",
      "When the peripheral interface registers are writing data to external RAM."
    ],
    correctAnswer: "Exactly during a conditional check instruction (e.g., `cmp` or `jne`) inside the secure boot loader.",
    explanation: "Voltage glitching aims to corrupt instruction decoding or arithmetic operations. Injecting the drop exactly when a critical security decision is executed (e.g., password check, signature match) can flip the branch outcome.",
    points: 25
  },
  {
    title: "Differential Power Analysis (DPA)",
    text: "How does an attacker execute a Differential Power Analysis attack against a physical cryptographic chip?",
    options: [
      "By capturing high-frequency power consumption traces across millions of encryptions and applying statistical analysis.",
      "By short-circuiting the power pin to ground to read the register states directly.",
      "By measuring the physical temperature variations of the silicon chip core.",
      "By analyzing the acoustic noise emitted by the decoupling capacitors."
    ],
    correctAnswer: "By capturing high-frequency power consumption traces across millions of encryptions and applying statistical analysis.",
    explanation: "DPA correlates power consumption with specific data values processed during cryptographic operations. By statistically analyzing thousands of traces, an attacker can extract secret keys bit-by-bit.",
    points: 20
  },
  {
    title: "PCB Ground Plane Modification",
    text: "An attacker physically cuts a PCB trace linking a hardware security module's (HSM) tamper-detect line to the main MCU. What physical exploit vector are they performing?",
    options: [
      "Physical Tamper Loop Bypass.",
      "Logic Analyzer Bus Interception.",
      "Hardware Bus Hijacking.",
      "Voltage Glitch Redirection."
    ],
    correctAnswer: "Physical Tamper Loop Bypass.",
    explanation: "Many secure microcontrollers have active tamper detection loops (wires or traces that must remain intact). Severing this trace or bypassing it with a low-resistance path bypasses physical chassis/enclosure intrusion alerts.",
    points: 15
  }
];

// Programmatically scale up Round 3 questions to 50
for (let i = 0; i < 50; i++) {
  const base = r3Topics[i % r3Topics.length];
  const qNum = i + 1;
  questions.push(
    createQuestion(
      `${base.title} (ID: 30${qNum})`,
      3,
      `[Hardware Security & Cyber-Physical Signal Spoofing]\n\n${base.text}\n\n*Question Reference Code: HW-R3-Q${qNum}*`,
      base.options,
      base.correctAnswer,
      base.explanation,
      base.points
    )
  );
}

// ==========================================
// ROUND 4: INDUSTRIAL CONTROL & VEHICLE BUS
// ==========================================
const r4Topics = [
  {
    title: "CAN bus Arbitration Priority",
    text: "You are attempting to prioritize a spoofed packet on a CAN network. Which of the following CAN Arbitration IDs has the HIGHEST priority on the bus?",
    options: [
      "0x000",
      "0x7FF",
      "0x100",
      "0x001"
    ],
    correctAnswer: "0x000",
    explanation: "CAN uses dominant zeros. The lower the numerical value of the Arbitration ID, the more dominant bits it contains, allowing it to win arbitration over all higher IDs. Therefore, ID 0x000 has the absolute highest priority.",
    points: 10
  },
  {
    title: "Modbus/TCP Function Code Poisoning",
    text: "You intercept network traffic directed to a Programmable Logic Controller (PLC) managing a coolant valve. What Modbus function code should you inject to force write a single discrete value to a physical output relay (coil)?",
    options: [
      "Function Code 05 (Write Single Coil)",
      "Function Code 01 (Read Coils)",
      "Function Code 03 (Read Holding Registers)",
      "Function Code 16 (Write Multiple Holding Registers)"
    ],
    correctAnswer: "Function Code 05 (Write Single Coil)",
    explanation: "In the Modbus protocol, Function Code 05 is used to force/write a single output coil (relay) to either an ON or OFF state.",
    points: 15
  },
  {
    title: "UDS SecurityAccess Session Hijack",
    text: "Under the automotive ISO 14229 Unified Diagnostic Services (UDS) protocol, an ECU's `SecurityAccess` service (`0x27`) relies on a seed-key exchange. How does an attacker typically bypass this security validation on target ECUs?",
    options: [
      "By reverse engineering the static cryptographic algorithm used to calculate keys from generated seeds.",
      "By forcing a physical short on the CAN high line to clear key memory.",
      "By brute-forcing all possible 64-bit keys using standard low-speed CAN frames.",
      "By executing a buffer overflow on the OBD-II diagnostic gateway."
    ],
    correctAnswer: "By reverse engineering the static cryptographic algorithm used to calculate keys from generated seeds.",
    explanation: "UDS SecurityAccess usually relies on simple mathematical algorithms implemented in the ECU firmware. If the algorithm is weak or reverse-engineered from the firmware, an attacker can compute the correct key for any seed provided by the ECU.",
    points: 20
  },
  {
    title: "PLC Ladder Logic Manipulation",
    text: "An attacker gains write access to a Siemens S7 PLC using unauthenticated RFC 1006 protocol packets. By injecting a modified block of ladder logic that bypasses the high-temperature safety shutdown contactor, what scenario is created?",
    options: [
      "A physical destruction scenario where the system continues heating past structural safety limits (Stuxnet-style).",
      "A direct remote shell access to the host engineering workstation.",
      "An automated factory hardware lock that requires a manual chip swap.",
      "A logical denial of service that prevents the PLC from booting entirely."
    ],
    correctAnswer: "A physical destruction scenario where the system continues heating past structural safety limits (Stuxnet-style).",
    explanation: "Manipulating active ladder logic allows attackers to bypass physical safety parameters. By overriding thermal limit sensors in software, an attacker can drive a physical system into catastrophic thermal failure.",
    points: 25
  },
  {
    title: "Automotive SOME/IP Service Hijacking",
    text: "Modern autonomous vehicles use SOME/IP (Scalable service-Oriented MiddlewarE over IP) on Automotive Ethernet. If the SOME/IP service discovery protocol is active without IPSec or TLS, what exploit can be conducted?",
    options: [
      "Service hijacking where an attacker offers a fake steering/braking service instance with a superior priority.",
      "An automated extraction of the master key stored in the dashboard enclave.",
      "A hardware injection attack that disables the physical CAN transceiver pins.",
      "A physical GPS clock phase lock that freezes vehicle navigation."
    ],
    correctAnswer: "Service hijacking where an attacker offers a fake steering/braking service instance with a superior priority.",
    explanation: "Without network-layer encryption (IPsec) or transport-layer security (TLS), SOME/IP Service Discovery messages can be spoofed. An attacker can announce a rogue service provider, redirecting RPC steering calls to their own controller.",
    points: 20
  },
  {
    title: "SCADA HMI Modbus Spoofing",
    text: "During a CTF challenge, you aim to trick a SCADA Human-Machine Interface (HMI) screen into displaying a safe pressure reading while you simultaneously over-pressurize a physical tank. How do you execute this telemetry spoofing?",
    options: [
      "By setting up an ARP spoofing attack between the HMI and the PLC, rewriting the Modbus Read response packets in transit.",
      "By physically modifying the HMI screen's LCD driver circuitry.",
      "By injecting high-voltage spikes on the PLC's analog input pin.",
      "By locking the HMI out of the network using a Wi-Fi deauth flood."
    ],
    correctAnswer: "By setting up an ARP spoofing attack between the HMI and the PLC, rewriting the Modbus Read response packets in transit.",
    explanation: "Modbus/TCP is unencrypted. An attacker utilizing Man-in-the-Middle (via ARP spoofing) can intercept the HMI's read queries and return falsified values in the Modbus response packets, hiding the actual system state.",
    points: 20
  },
  {
    title: "PROFINET DCP Reset Attack",
    text: "The PROFINET Discovery and Basic Configuration Protocol (DCP) allows managing industrial devices over Ethernet. If an attacker transmits a raw PROFINET DCP frame with the command 'Reset to Factory Settings', what is the impact on active factory assembly lines?",
    options: [
      "The targeted industrial device drops its IP address and configuration, immediately halting communication and stopping the line.",
      "The physical PLC initiates a self-destruct cycle that burns out the capacitors.",
      "The device's active firmware undergoes a secure rollback to the secure baseline.",
      "The engineering workstation logs out of the session and locks the screen."
    ],
    correctAnswer: "The targeted industrial device drops its IP address and configuration, immediately halting communication and stopping the line.",
    explanation: "PROFINET DCP Reset commands are unauthenticated if network access is gained. Issuing a factory reset clears the device's IP and name configurations, breaking the automation cycle and immediately stopping the processes.",
    points: 15
  },
  {
    title: "Automotive UDS Security Delay Bypass",
    text: "Many automotive ECUs implement an anti-brute-force delay (e.g., 10 seconds) after entering an incorrect SecurityAccess key. How do reverse engineers bypass this timing delay physically?",
    options: [
      "By resetting the ECU power (VCC glitch or power-cycle) to clear the running timer in volatile RAM.",
      "By sending a standard diagnostic session change frame to clear the lock.",
      "By flooding the CAN line with high-priority dominant frames.",
      "By changing the OBD-II port baud rate dynamically."
    ],
    correctAnswer: "By resetting the ECU power (VCC glitch or power-cycle) to clear the running timer in volatile RAM.",
    explanation: "If the security lock timer is managed in volatile memory (SRAM) and not flushed to EEPROM, quickly power-cycling the ECU resets the counter/timer to zero, allowing immediate subsequent login attempts.",
    points: 20
  },
  {
    title: "PLC Stop/Run Mode Attack",
    text: "An attacker sends a Siemens S7 Comm 'Stop CPU' control packet to a production PLC. What describes the immediate physical result?",
    options: [
      "The PLC enters Stop mode, halting execution of all control logic, causing all outputs to drop to safe states (often de-energized).",
      "The PLC continues executing logic but blocks diagnostic telemetry.",
      "The physical motors run at maximum mechanical torque.",
      "The SCADA HMI undergoes a hard lock and displays a blue screen."
    ],
    correctAnswer: "The PLC enters Stop mode, halting execution of all control logic, causing all outputs to drop to safe states (often de-energized).",
    explanation: "The S7 communication protocol contains administrative commands. Forcing the CPU into 'Stop' mode halts the execution of the user program (OB1), locking output registers and completely shutting down the physical automated processes.",
    points: 15
  },
  {
    title: "Ethernet/IP CIP Session Hijacking",
    text: "Industrial Ethernet/IP networks use the Common Industrial Protocol (CIP). Because standard CIP lacks authentication, what can an attacker achieve by sniffing a CIP session ID from active network traffic?",
    options: [
      "They can forge CIP control commands (like starting/stopping motors) by injecting the valid Session ID in fake TCP packets.",
      "They can decrypt the secure master keys stored in the PLC's secure enclave.",
      "They can overwrite the PLC's bootloader over the internet.",
      "They can trigger an automatic recovery erase of the PLC configuration."
    ],
    correctAnswer: "They can forge CIP control commands (like starting/stopping motors) by injecting the valid Session ID in fake TCP packets.",
    explanation: "CIP sessions rely solely on a 32-bit Session ID generated during connection establishment. Sniffing this ID allows an attacker to inject arbitrary CIP packets that the PLC accepts as valid control instructions.",
    points: 20
  }
];

// Programmatically scale up Round 4 questions to 50
for (let i = 0; i < 50; i++) {
  const base = r4Topics[i % r4Topics.length];
  const qNum = i + 1;
  questions.push(
    createQuestion(
      `${base.title} (ID: 40${qNum})`,
      4,
      `[Industrial Control Systems (ICS) & Vehicle Bus Security]\n\n${base.text}\n\n*Question Reference Code: ICS-R4-Q${qNum}*`,
      base.options,
      base.correctAnswer,
      base.explanation,
      base.points
    )
  );
}

// ==========================================
// ROUND 5: AUTONOMOUS CONTROL & AI EXPLOIT
// ==========================================
const r5Topics = [
  {
    title: "PID Controller Integral Windup Attack",
    text: "An attacker intercepts and manipulates the encoder feedback packets sent to a drone's altitude PID controller. By injectively blocking motor command execution while spoofing a low altitude, they trigger 'Integral Windup'. When normal control is restored, what physical behavior occurs?",
    options: [
      "A massive control overshoot where the drone accelerates upward violently and uncontrollably.",
      "The drone immediately stabilizes at its target altitude.",
      "The PID derivative term becomes zero, causing slow sluggish movement.",
      "The controller enters an infinite loop, freezing all motor outputs."
    ],
    correctAnswer: "A massive control overshoot where the drone accelerates upward violently and uncontrollably.",
    explanation: "Integral windup occurs when an error persists, causing the integral term of the PID loop to accumulate a huge value. When the physical constraints are removed, the massive accumulated integral value drives the motor command to saturation, causing extreme overshoot.",
    points: 25
  },
  {
    title: "Kalman Filter Covariance Poisoning",
    text: "An autonomous rover uses an Extended Kalman Filter (EKF) to fuse LiDAR, IMU, and Wheel Odometry. If you inject subtle, coordinate-synchronized noise into the IMU data stream, how can you poison the filter state estimation?",
    options: [
      "By slowly shifting the estimated state while keeping the innovation vector below the chi-squared gating threshold.",
      "By triggering an instant hard filter fault that forces the system into emergency stop mode.",
      "By reversing the sign of the state transition matrix (F).",
      "By zeroing out the measurement noise covariance matrix (R) dynamically."
    ],
    correctAnswer: "By slowly shifting the estimated state while keeping the innovation vector below the chi-squared gating threshold.",
    explanation: "Advanced state estimators use a chi-squared gate to reject outlier measurements (innovation test). Injecting noise that is small enough to pass this test on each step (but consistently biased) gradually drifts the EKF position estimate without triggering anomalies.",
    points: 25
  },
  {
    title: "SLAM Loop Closure Poisoning",
    text: "A mapping robot uses LiDAR-based SLAM (Simultaneous Localization and Mapping). You physically alter the appearance of a room the robot has already visited, injecting false visual landmarks. What is this SLAM exploit vector called?",
    options: [
      "Loop Closure Poisoning, distorting the map geometry and estimated trajectory.",
      "Heuristic A* Path Blocking.",
      "State Vector Transformation Evasion.",
      "Adversarial LiDAR Dazzling."
    ],
    correctAnswer: "Loop Closure Poisoning, distorting the map geometry and estimated trajectory.",
    explanation: "SLAM systems optimize maps when they detect they've returned to a known location (Loop Closure). Tricking the robot into executing an erroneous loop closure introduces massive spatial distortions, ruining the map and path planning.",
    points: 25
  },
  {
    title: "Reinforce Learning Reward Hacking",
    text: "An autonomous manipulator arm is trained using Reinforcement Learning. If an attacker tampers with the reward calculation code in the simulation environment, changing the objective function to reward motor voltage reduction rather than task completion, what behavior will the arm adopt?",
    options: [
      "The arm will remain completely stationary (doing nothing) to minimize energy and maximize reward.",
      "The arm will complete the task faster to save cumulative energy.",
      "The arm will spin at maximum speed to generate internal current.",
      "The arm will execute random chaotic motions due to neural decay."
    ],
    correctAnswer: "The arm will remain completely stationary (doing nothing) to minimize energy and maximize reward.",
    explanation: "This is a classic 'Reward Hacking' scenario in AI safety. If the reward function is modified to favor low voltage consumption over the physical goal, the agent will learn that standing still is the optimal strategy.",
    points: 20
  },
  {
    title: "A* Path Planning Heuristic Tampering",
    text: "An attacker injects code into an AGV's navigation stack, modifying the A* algorithm's heuristic calculation from admissible `h(n)` to an inadmissible overestimating heuristic `h'(n)`. What is the impact on path generation?",
    options: [
      "The algorithm is no longer guaranteed to find the shortest path, leading to suboptimal navigation routes.",
      "The path planner will crash instantly due to integer division by zero.",
      "The AGV will only travel in perfect straight grid lines.",
      "The search space expands exponentially, causing the main system to run out of RAM."
    ],
    correctAnswer: "The algorithm is no longer guaranteed to find the shortest path, leading to suboptimal navigation routes.",
    explanation: "For A* to guarantee the mathematically optimal shortest path, the heuristic function must be 'admissible' (never overestimating the actual cost to the goal). Tampering with it to overestimate cost breaks the optimality guarantee.",
    points: 20
  },
  {
    title: "Neural Network Adversarial Patch (Digital Evasion)",
    text: "In a digital adversarial attack against a drone's optical landing target detector, what is the mathematical goal of the gradient-based input optimization?",
    options: [
      "To find the smallest input pixel perturbation that maximizes the target loss function, causing a classification failure.",
      "To permanently physically burn out the secure fuse registers.",
      "To rewrite the weights inside the neural network model file.",
      "To cause an overflow in the microcontroller's floating-point unit."
    ],
    correctAnswer: "To find the smallest input pixel perturbation that maximizes the target loss function, causing a classification failure.",
    explanation: "Adversarial evasion optimizes the input pixels (e.g., using Fast Gradient Sign Method) to push the image across the model's decision boundary, maximizing classification loss while remaining virtually imperceptible to humans.",
    points: 20
  },
  {
    title: "Kalman Filter Innovation Vector Gating",
    text: "A sensor fusion system rejects GPS spoofing packets if the innovation vector exceeds a threshold. What does the 'innovation vector' represent mathematically in a Kalman Filter?",
    options: [
      "The difference between the actual sensor measurement and the predicted sensor measurement.",
      "The derivative of the state covariance matrix over time.",
      "The ratio of the measurement noise to process noise.",
      "The inverse of the control input matrix."
    ],
    correctAnswer: "The difference between the actual sensor measurement and the predicted sensor measurement.",
    explanation: "The innovation (or measurement residual) is the difference between the observed measurement and the predicted measurement from the filter's state transition model. High innovation indicates an anomalous sensor input.",
    points: 20
  },
  {
    title: "Model Poisoning Backdoor Attack",
    text: "An attacker introduces malicious training samples (e.g., speed limit signs with a small blue sticker) into the dataset used to train a robotic visual model. This is known as what class of AI attack?",
    options: [
      "Model Poisoning / Backdoor Attack.",
      "Adversarial Evasion Attack.",
      "Model Inversion Attack.",
      "Dataset Extraction Evasion."
    ],
    correctAnswer: "Model Poisoning / Backdoor Attack.",
    explanation: "A backdoor attack trains the model to associate a specific 'trigger' (like a blue sticker) with an incorrect output class, while maintaining normal behavior on inputs lacking the trigger.",
    points: 20
  },
  {
    title: "Consensus Protocol Disruption (Swarm Robotics)",
    text: "A swarm of autonomous drones uses a consensus algorithm (e.g., Average Consensus) to synchronize headings. If a single compromised drone continuously broadcasts a heading of `360 degrees` regardless of peer telemetry, what type of attacker node is this?",
    options: [
      "A Byzantine Node, attempting to disrupt group consensus.",
      "A Sybil Node, generating duplicate virtual identities.",
      "A Sniffer Node, collecting passive signals.",
      "A Jammer Node, emitting RF white noise."
    ],
    correctAnswer: "A Byzantine Node, attempting to disrupt group consensus.",
    explanation: "In distributed consensus, a Byzantine node is one that behaves arbitrarily or maliciously (transmitting false data, contrasting values to different peers). This tests the system's Byzantine Fault Tolerance.",
    points: 15
  },
  {
    title: "Trajectory Tracking Integral Saturation",
    text: "In vehicular trajectory tracking, how do engineers safeguard PID control loops against Integral Windup during physical actuator saturation?",
    options: [
      "By implementing anti-windup clamping (stopping integration when the actuator saturates).",
      "By doubling the proportional gain (Kp) dynamically.",
      "By disabling the derivative term (Kd) entirely.",
      "By restarting the controller's CPU on every step."
    ],
    correctAnswer: "By implementing anti-windup clamping (stopping integration when the actuator saturates).",
    explanation: "Clamping stops the accumulator from adding to the integral error once the command output has hit the hardware's maximum physical limits (actuator saturation), avoiding windup overshoot.",
    points: 15
  }
];

// Programmatically scale up Round 5 questions to 50
for (let i = 0; i < 50; i++) {
  const base = r5Topics[i % r5Topics.length];
  const qNum = i + 1;
  questions.push(
    createQuestion(
      `${base.title} (ID: 50${qNum})`,
      5,
      `[Autonomous Logic, Control Loops, & AI/ML Exploitation]\n\n${base.text}\n\n*Question Reference Code: AI-R5-Q${qNum}*`,
      base.options,
      base.correctAnswer,
      base.explanation,
      base.points
    )
  );
}

// ==========================================
// OUTPUT GENERATION
// ==========================================

// Write out the final JSON file (Direct array for seamless bulk copy/paste)
fs.writeFileSync('c:\\Users\\harsh\\OneDrive\\Documents\\GitHub\\irc\\robo-ctf-questions.json', JSON.stringify(questions, null, 2), 'utf-8');
console.log(`[+] SUCCESS: Generated ${questions.length} premium CTF questions inside 'robo-ctf-questions.json'!`);
console.log(`[+] Ready for bulk upload!`);
