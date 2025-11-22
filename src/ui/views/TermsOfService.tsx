import { motion } from 'framer-motion'

export default function TermsOfService() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 md:p-8 shadow-fantasy">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 font-heading">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-6">Last Updated: January 2025</p>

        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By downloading, installing, or playing Whisker Wars, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">License to Use</h2>
            <p className="leading-relaxed mb-3">
              We grant you a limited, non-exclusive, non-transferable, revocable license to use Whisker Wars for personal, non-commercial entertainment purposes.
            </p>
            <p className="leading-relaxed">
              You may not:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Modify, reverse engineer, or decompile the application</li>
              <li>Remove or alter any copyright, trademark, or proprietary notices</li>
              <li>Use the application for any commercial purpose</li>
              <li>Distribute, sublicense, or transfer the application to others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Intellectual Property</h2>
            <p className="leading-relaxed">
              All content, features, and functionality of Whisker Wars, including but not limited to text, graphics, logos, images, and software, are the property of the developers and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Gameplay and Features</h2>
            <p className="leading-relaxed">
              Whisker Wars is a single-player, offline game. All game progress is stored locally on your device. We reserve the right to modify, update, or discontinue features of the game at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">No Purchases or Transactions</h2>
            <p className="leading-relaxed">
              Whisker Wars is provided free of charge with no in-app purchases, advertisements, or monetary transactions. All game currency and items are virtual and have no real-world monetary value.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Disclaimer of Warranties</h2>
            <p className="leading-relaxed">
              Whisker Wars is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the application will be uninterrupted, error-free, or free of viruses or other harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">User Conduct</h2>
            <p className="leading-relaxed">
              You agree to use Whisker Wars in a lawful manner and in accordance with these Terms. While the game is offline and single-player, you agree not to attempt to exploit, hack, or manipulate the application in any way that violates these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Updates and Modifications</h2>
            <p className="leading-relaxed">
              We may update Whisker Wars from time to time to add features, fix bugs, or improve performance. Updates may be required to continue using the application. We reserve the right to modify these Terms at any time, with changes taking effect upon posting.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Termination</h2>
            <p className="leading-relaxed">
              We reserve the right to terminate or suspend your access to Whisker Wars at any time, without prior notice or liability, for any reason, including breach of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Governing Law</h2>
            <p className="leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the developers are located, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 font-heading">Contact Information</h2>
            <p className="leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through the app store page or our GitHub repository.
            </p>
          </section>

          <section className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-400 italic">
              By continuing to use Whisker Wars, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
