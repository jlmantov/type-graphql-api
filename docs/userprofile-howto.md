# How how to define a user profile?
## ... structuring accounts, emails and personal settings

I've been speculating on how to implement a structure for having accounts, emails/logins and user profiles - so that one person (profile) can have multiple emails (logins) and multiple accounts with separate access rigths (login controls access rights).

Google Cloud: [13 best practices for user account, authentication, and password management, 2021 edition](https://cloud.google.com/blog/products/identity-security/account-authentication-and-password-management-best-practices)
[Data Structure Deep Dive](https://developer.mixpanel.com/docs/data-structure-deep-dive)
[What Is User Profile? Why Is It Important? How To Implement It?](https://www.arnicasoftware.com/blog/what-is-user-profile-why-is-it-important-how-to-implement-it-/2825/index.aspx)

Imagine a person having a user profile with different logins: one for work with specific company access rigths (through a specific work mobile or PC) and another personal account with completely different settings (most likely through another mobile or PC)...

So far, I've reached to these conclusions:
1.  Person equals profile
2.  one-to-many relation between profile and user (login) - one profile can have multiple logins
3.  one-to-many relation between user and account - one login can have multiple accounts
4.  one-to-one relation between account and access rights - access rights are controlled by each account

The simple scenario: one user, one account - no problem!
The advanced scenario: one user, multiple accounts through multiple logins - no problem!

This allows:
- personalization (user settings) are controled by the profile
- login to a profile using any given login attached to it
- when view is switched to another account, the access rights follow along
- confirmation emails ensure that any given rights are handled correct
- the profile gains access to a list of logins (with login specific access rigths)

Pros:
- the person will get a clear overview of accessible logins/accounts
- authorization to any given account can be granted/revoked by someone else (e.g. a manager at work)
- great UX design - lots of possibilities

Cons:
- complex data structure (well, manageable when the relations are visualized)

I would be surprised if there weren't any trade-offs somewhere, other than complexity ... perhaps limitations or hacking/security issues.

If you spot something of importance that isn't mentioned here, I would be pleased to be notified and enriched with a broader perspective.
