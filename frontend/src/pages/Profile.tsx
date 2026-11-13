import { useState, useRef, type FormEvent } from 'react'
import { Camera, LogOut, UserRound } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useUser } from '../services/queries'
import { authService } from '../services/authService'
import { errorMessage } from '../services/api'
import { useAuth } from '../store/auth'
import { toast } from '../store/toasts'
import type { User } from '../types'

function ProfileForm({ user }: { user: User }) {
  const client = useQueryClient()
  const photoInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user.full_name || '')
  const [institution, setInstitution] = useState(user.institution || '')
  const [interests, setInterests] = useState(user.research_interests || '')
  const [bio, setBio] = useState(user.bio || '')
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function saved(updated: User, message: string) {
    client.setQueryData(['user'], updated)
    setSuccess(message)
    toast(message)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      saved(
        await authService.updateProfile({
          full_name: name.trim(),
          institution,
          research_interests: interests,
          bio,
        }),
        'Profile saved.',
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  async function changePhoto(file?: File) {
    setError('')
    setSuccess('')
    if (
      file &&
      (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 2 * 1024 * 1024)
    ) {
      setError('Choose a JPG, PNG, or WebP photo up to 2 MB.')
      if (photoInput.current) photoInput.current.value = ''
      return
    }
    setPhotoBusy(true)
    try {
      saved(
        file ? await authService.uploadPhoto(file) : await authService.removePhoto(),
        file ? 'Profile photo saved.' : 'Profile photo removed.',
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPhotoBusy(false)
      if (photoInput.current) photoInput.current.value = ''
    }
  }
  return (
    <>
      <section className="profile-summary" aria-label="Your account">
        <div className="profile-photo">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Your profile" />
          ) : (
            <UserRound size={48} />
          )}
        </div>
        <div className="profile-identity">
          <h2>{user.full_name || 'Researcher'}</h2>
          <p>{user.email}</p>
          <span className="muted">
            Member since{' '}
            {new Date(user.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <div className="profile-photo-actions">
            <button
              className="button secondary small"
              disabled={photoBusy}
              onClick={() => photoInput.current?.click()}
            >
              <Camera size={16} />
              {photoBusy ? 'Saving photo…' : 'Upload photo'}
            </button>
            {user.avatar_url && (
              <button
                className="text-button"
                disabled={photoBusy}
                onClick={() => void changePhoto()}
              >
                Remove photo
              </button>
            )}
          </div>
          <small className="muted">JPG, PNG, or WebP. Up to 2 MB and 12 megapixels.</small>
          <input
            ref={photoInput}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose profile photo"
            disabled={photoBusy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void changePhoto(file)
            }}
          />
        </div>
      </section>
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success-message" role="status">
          {success}
        </p>
      )}
      <form className="form-stack profile-form" onSubmit={(event) => void save(event)}>
        <h2>Personal details</h2>
        <label htmlFor="profile-name">
          Full name
          <input
            id="profile-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={150}
          />
        </label>
        <label htmlFor="profile-email">
          Email address
          <input id="profile-email" type="email" value={user.email} readOnly />
        </label>
        <label htmlFor="profile-institution">
          Institution or organization
          <input
            id="profile-institution"
            autoComplete="organization"
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            maxLength={200}
            placeholder="University, research lab, or organization"
          />
        </label>
        <label htmlFor="profile-interests">
          Research interests
          <input
            id="profile-interests"
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            maxLength={500}
            placeholder="For example: natural language processing, education"
          />
        </label>
        <label htmlFor="profile-bio">
          About you
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="A little about your research or studies"
          />
        </label>
        <div>
          <button className="button primary" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
      <section className="settings-section">
        <h2>Session</h2>
        <button
          className="button secondary"
          onClick={() => {
            useAuth.getState().logout()
            client.clear()
          }}
        >
          <LogOut size={17} />
          Log out
        </button>
      </section>
    </>
  )
}

export default function Profile() {
  const { data: user } = useUser()
  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <div>
          <h1>Your profile</h1>
          <p>Your details, research interests, and profile photo.</p>
        </div>
      </header>
      {user && <ProfileForm key={user.id} user={user} />}
    </div>
  )
}
