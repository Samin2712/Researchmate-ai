import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/shared/PublicLayout'

const contact = <a href="mailto:researchmateai123@gmail.com">researchmateai123@gmail.com</a>

export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy'
  const title = privacy ? 'Privacy policy' : 'Terms of service'
  useEffect(() => {
    document.title = `${title} | ResearchMate AI`
    window.scrollTo(0, 0)
    return () => {
      document.title = 'ResearchMate AI'
    }
  }, [title])
  return (
    <PublicLayout>
      <article className="legal-document">
        <header>
          <p className="public-intro">ResearchMate AI</p>
          <h1>{title}</h1>
          <p className="legal-updated">Effective November 19, 2026</p>
          <p>
            {privacy
              ? 'This policy explains what ResearchMate AI collects, how we use it, and the choices you have when using this research-assistance website.'
              : 'These terms explain the rules for using ResearchMate AI. By creating an account or using the service, you agree to these terms.'}
          </p>
        </header>
        {privacy ? (
          <>
            <section>
              <h2>Who to contact</h2>
              <p>
                ResearchMate AI is a research-assistance project. For privacy questions, account
                requests, or concerns about your information, contact the project operator at{' '}
                {contact}.
              </p>
            </section>
            <section>
              <h2>Information we collect</h2>
              <ul>
                <li>
                  <strong>Account information:</strong> your email address, name, account creation
                  date, sign-in method, and verification status. For password accounts, we store a
                  password hash, not your readable password.
                </li>
                <li>
                  <strong>Google sign-in information:</strong> your Google account identifier, email
                  address and verification status, and name when provided, to identify and sign you
                  into your ResearchMate account.
                </li>
                <li>
                  <strong>Optional profile information:</strong> a profile photo, institution,
                  biography, research interests, and account preferences you choose to provide.
                </li>
                <li>
                  <strong>Research content:</strong> uploaded PDFs, document metadata and extracted
                  text, search representations of that text, questions, conversations, notes,
                  collections, and analysis results.
                </li>
                <li>
                  <strong>Operational information:</strong> request and error logs, timestamps,
                  service diagnostics, and rate-limit records. Our hosting provider may process IP
                  addresses and other connection information. Application rate-limit identifiers are
                  hashed.
                </li>
              </ul>
            </section>
            <section>
              <h2>How we use your information</h2>
              <p>
                We use this information to maintain your account and library, answer research
                questions, generate requested analyses, send account-verification and password-reset
                emails, prevent abuse, and troubleshoot the service. Your library and conversations
                are associated with your account and are not published as a public feed.
              </p>
            </section>
            <section>
              <h2>Google sign-in and Gmail permissions</h2>
              <p>
                Google sign-in uses basic identity information. We do not request permission to read
                your Gmail inbox, contacts, or Google Drive files.
              </p>
              <p>
                Account emails are sent through the Gmail API from the project mailbox,
                researchmateai123@gmail.com. Only the project operator authorizes that mailbox to
                send messages. Website users do not grant access to their own mailboxes. Google
                processes the recipient address and message content, and sent messages may remain in
                the project mailbox.
              </p>
              <p>
                We use Google account information only to provide account and email features. We do
                not sell it, use it for advertising, or share it for unrelated purposes. Our
                handling of Google API information follows the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google API Services User Data Policy
                </a>
                , including its Limited Use requirements where applicable.
              </p>
            </section>
            <section>
              <h2>AI processing and service providers</h2>
              <p>
                To provide AI features, relevant document text, questions, conversation context, and
                requested analysis instructions may be sent to the configured AI provider. The
                hosted service uses Google Gemini for AI responses and text embeddings. A
                differently configured deployment may use OpenAI or Anthropic for AI responses.
              </p>
              <p>
                Render provides website and backend hosting. Database and infrastructure providers
                process information needed to store and operate the service. Google provides sign-in
                and Gmail delivery. Providers process information under their own terms and privacy
                policies; we do not promise that their retention or model-improvement practices are
                the same as ours.
              </p>
              <p>
                Upload only information you are authorized to share with the service and its
                providers. Avoid uploading confidential, highly sensitive, or restricted material
                unless you have the necessary permission. Authorized operators may access stored
                information when necessary to maintain the service or respond to a support request.
              </p>
            </section>
            <section>
              <h2>Browser storage</h2>
              <p>
                The website stores your sign-in token and preferences in your browser so you can
                stay signed in and retain settings. Signing out removes the local sign-in token.
                Clearing site data removes locally stored settings. The application does not
                currently include advertising trackers or third-party analytics scripts. Google
                sign-in may use Google-managed storage and requests.
              </p>
            </section>
            <section>
              <h2>Retention, deletion, and your choices</h2>
              <p>
                Account and research information is retained to provide your workspace until you
                remove supported items or request account deletion. You can edit your profile and
                delete papers, conversations, and notes using available controls. Saved notes or
                conversations can retain passages from a paper until those items are deleted
                separately.
              </p>
              <p>
                There is no self-service account-deletion button at present. To request account
                deletion or a copy of information associated with your account, email {contact} from
                your registered address. We may need to verify ownership before acting. Operational
                logs, provider backups, and sent emails may remain for a period under the relevant
                provider's retention practices or where needed for security or legal obligations.
              </p>
              <p>
                You can revoke Google authorization through your{' '}
                <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">
                  Google account connections
                </a>
                . Revoking access does not itself delete information already stored in ResearchMate
                AI.
              </p>
            </section>
            <section>
              <h2>Security and international processing</h2>
              <p>
                We use password hashing, account access controls, expiring verification/reset links,
                and HTTPS on the hosted service. No system can guarantee complete security or
                uninterrupted availability. Hosting and processing may take place outside your
                country, depending on the locations used by our providers.
              </p>
            </section>
            <section>
              <h2>Children and policy changes</h2>
              <p>
                The service is not designed for children under 13. If you believe a child has
                provided personal information, contact us. We may update this policy as the service
                changes; the effective date appears above. Material changes to our use of Google
                data will be disclosed and consent requested where required.
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h2>The service</h2>
              <p>
                ResearchMate AI helps users organize research papers, ask questions, inspect
                supporting sources, and generate analyses. Availability and processing depend on
                hosting resources, email delivery, and AI-provider limits. Features and limits may
                change as the project develops.
              </p>
            </section>
            <section>
              <h2>Your account</h2>
              <p>
                Provide an email address you control and accurate account information. New
                email/password accounts require email verification; Google sign-in relies on
                Google's verified identity. Keep credentials and verification/reset links private.
                You are responsible for activity through your account and should contact {contact}{' '}
                if you suspect unauthorized access.
              </p>
            </section>
            <section>
              <h2>Your content and permissions</h2>
              <p>
                You retain any rights you hold in the papers and other content you provide. You give
                the service permission to store and process that content, including through its
                infrastructure and AI providers, to deliver the features you request. You must have
                permission to upload the material and to share it for this processing. Do not upload
                confidential or restricted content without authorization.
              </p>
            </section>
            <section>
              <h2>Acceptable use</h2>
              <ul>
                <li>
                  Do not use the service for unlawful activity, infringement, harassment, or
                  distribution of malicious content.
                </li>
                <li>
                  Do not try to access another user's account or data, bypass access controls,
                  extract secrets, or interfere with the website.
                </li>
                <li>
                  Do not send unsolicited verification/reset messages, automate abusive requests, or
                  evade usage limits.
                </li>
                <li>
                  Follow applicable copyright, privacy, academic-integrity, and institutional rules
                  when uploading papers or using generated work.
                </li>
              </ul>
            </section>
            <section>
              <h2>AI outputs and research responsibility</h2>
              <p>
                AI responses can contain mistakes, omit context, or misinterpret evidence. Citations
                and confidence indicators are aids to review, not guarantees of accuracy. Check the
                original sources and exercise your own judgment before citing or relying on an
                answer. The service does not provide professional medical, legal, financial, or
                other regulated advice.
              </p>
              <p>
                Generated material may be similar to material produced for others. We do not
                guarantee originality, ownership rights, completeness, or suitability for
                publication.
              </p>
            </section>
            <section>
              <h2>Privacy and third-party services</h2>
              <p>
                Our <Link to="/privacy">Privacy policy</Link> explains data collection and
                processing. Google sign-in, Gmail delivery, AI providers, and hosting services have
                their own terms. Their outages, account restrictions, and filtering decisions can
                affect your use of ResearchMate AI.
              </p>
            </section>
            <section>
              <h2>Availability, changes, and termination</h2>
              <p>
                The current website is offered without a subscription charge. Free hosting and
                provider quotas can limit availability. We may modify, suspend, or discontinue
                features, and may restrict accounts that abuse the service or create security risks.
                We will communicate material changes through the website or account contact where
                appropriate. Any future paid offering would require separate pricing and acceptance.
              </p>
              <p>
                You can stop using the service at any time, delete supported content, and request
                account deletion by contacting {contact}. Keep your own copies of important papers
                and notes.
              </p>
            </section>
            <section>
              <h2>Disclaimers and responsibility</h2>
              <p>
                The service is provided as available, without a promise of uninterrupted operation,
                permanent storage, or error-free output. To the extent permitted by applicable law,
                the operator is not responsible for losses caused by reliance on AI output, service
                interruptions, or loss of content. Nothing in these terms excludes rights or
                responsibilities that applicable law does not allow to be excluded.
              </p>
            </section>
            <section>
              <h2>Updates and contact</h2>
              <p>
                Updated terms will appear on this page with a revised effective date. Review
                material updates before continuing to use the service. Send questions, requests, and
                reports of misuse to {contact}.
              </p>
            </section>
          </>
        )}
      </article>
    </PublicLayout>
  )
}
