import { useState } from 'react'
import { useStore } from '../store'
import { useToasts } from '../lib/toast'
import Wordmark from '../components/Wordmark'
import Button from '../components/ui/Button'

const CLASS_YEARS = [2027, 2028, 2029, 2030] as const

// A plausible princeton.edu email (we don't verify it's real, just well-formed).
const PRINCETON_EMAIL = /^[a-z0-9]([a-z0-9._%+-]*[a-z0-9])?@princeton\.edu$/i

const inputCls =
  'h-11 w-full rounded-md border border-border bg-white px-3 text-[15px] text-text placeholder:text-muted transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300'
const labelCls = 'mb-1.5 block text-[13px] font-medium text-text'

/**
 * Client-only "sign in". Enter a princeton.edu email: a returning email signs you
 * straight back in; a new email opens a short form (name + class year) that mints
 * a local account with auto-generated club credentials. No backend, no password.
 */
export default function SignIn() {
  const signIn = useStore((s) => s.signIn)
  const signUp = useStore((s) => s.signUp)
  const accountExists = useStore((s) => s.accountExists)
  const push = useToasts((s) => s.push)

  const [step, setStep] = useState<'email' | 'details'>('email')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [classYear, setClassYear] = useState<number>(2028)
  const [error, setError] = useState<string | null>(null)

  const onContinue = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!PRINCETON_EMAIL.test(clean)) {
      setError('Enter a valid princeton.edu email.')
      return
    }
    setError(null)
    if (accountExists(clean)) {
      const r = signIn(clean)
      if (!r.ok) setError(r.reason ?? 'Could not sign in.')
      // success re-renders the app (session set)
    } else {
      setStep('details')
    }
  }

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.')
      return
    }
    const r = signUp({ firstName: firstName.trim(), lastName: lastName.trim(), classYear, email })
    if (!r.ok) {
      setError(r.reason ?? 'Could not create your account.')
      return
    }
    push(`Welcome, ${firstName.trim()}!`, 'success')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="h-5 w-full bg-pink-500" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <Wordmark />
          </div>

          <div className="rounded-md border border-border bg-white p-6 shadow-hoagie">
            {step === 'email' ? (
              <form onSubmit={onContinue} noValidate>
                <h1 className="font-brand text-[22px] font-extrabold leading-tight text-pink-900">
                  Every function on campus
                </h1>
                <p className="mt-1 text-[14px] text-muted">
                  Sign in with your Princeton email to get started.
                </p>

                <label className={`${labelCls} mt-5`} htmlFor="email">
                  Princeton email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  inputMode="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  placeholder="netid@princeton.edu"
                />
                {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}

                <div className="mt-5">
                  <Button type="submit" className="w-full justify-center">
                    Continue
                  </Button>
                </div>
                <p className="mt-3 text-center text-[12px] text-muted">
                  New here? We&rsquo;ll set up your account next.
                </p>
              </form>
            ) : (
              <form onSubmit={onCreate} noValidate>
                <h1 className="font-brand text-[22px] font-extrabold leading-tight text-pink-900">
                  Set up your account
                </h1>
                <p className="mt-1 text-[14px] text-muted">
                  For <span className="font-medium text-text">{email.trim().toLowerCase()}</span>
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="first">
                      First name
                    </label>
                    <input
                      id="first"
                      autoFocus
                      className={inputCls}
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        setError(null)
                      }}
                      placeholder="Alex"
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="last">
                      Last name
                    </label>
                    <input
                      id="last"
                      className={inputCls}
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value)
                        setError(null)
                      }}
                      placeholder="Nguyen"
                    />
                  </div>
                </div>

                <label className={`${labelCls} mt-4`} htmlFor="year">
                  Class year
                </label>
                <select
                  id="year"
                  className={inputCls}
                  value={classYear}
                  onChange={(e) => setClassYear(Number(e.target.value))}
                >
                  {CLASS_YEARS.map((y) => (
                    <option key={y} value={y}>
                      Class of {y}
                    </option>
                  ))}
                </select>
                {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}

                <div className="mt-5 flex items-center gap-3">
                  <Button type="submit" className="flex-1 justify-center">
                    Create account
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setStep('email')
                      setError(null)
                    }}
                  >
                    Back
                  </Button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-muted">
            Demo build - your account lives in this browser only.
          </p>
        </div>
      </div>
    </div>
  )
}
