import { motion } from 'framer-motion'

export default function PrivacyPolicy() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 md:p-8 shadow-fantasy">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 font-heading">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-6">Last Updated: January 2025</p>

        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Introduction</h2>
            <p className="leading-relaxed">
              Whisker Wars ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile game application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Information We Collect</h2>
            <h3 className="text-lg font-semibold text-white mb-2">Local Storage Only</h3>
            <p className="leading-relaxed mb-3">
              Whisker Wars stores all game data locally on your device. We do not collect, transmit, or store any personal information on external servers. The data stored locally includes:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Game progress and statistics</li>
              <li>Player profile names (chosen by you)</li>
              <li>Cat collection and inventory</li>
              <li>Achievements and battle history</li>
              <li>Game preferences and settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Data Security</h2>
            <p className="leading-relaxed">
              Since all data is stored locally on your device, the security of your game data is protected by your device's security measures. We recommend keeping your device secure with appropriate passwords and security settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Third-Party Services</h2>
            <p className="leading-relaxed">
              Whisker Wars does not integrate with any third-party analytics, advertising, or tracking services. Your gameplay experience is private and not monitored by external parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Children's Privacy</h2>
            <p className="leading-relaxed">
              Whisker Wars is suitable for all ages. We do not knowingly collect any personal information from children or any other users, as all data remains local to the device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Data Deletion</h2>
            <p className="leading-relaxed">
              You can delete your game data at any time by:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Deleting individual profiles within the game</li>
              <li>Clearing the app's data through your device settings</li>
              <li>Uninstalling the application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes will be reflected in the "Last Updated" date at the top of this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through the app store page or create an issue on our GitHub repository.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
