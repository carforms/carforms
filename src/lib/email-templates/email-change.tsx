import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import {
  LOGO_URL,
  button,
  container,
  footer,
  h1,
  link,
  logo,
  logoWrap,
  main,
  text,
} from './_shared'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Bestätige deine neue E-Mail für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrap}>
          <Img src={LOGO_URL} alt={siteName} style={logo} />
        </div>
        <Heading style={h1}>E-Mail-Änderung bestätigen</Heading>
        <Text style={text}>
          Du hast eine Änderung deiner E-Mail-Adresse bei {siteName}{' '}
          angefordert: von{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          zu{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Klicke auf den Button, um die Änderung zu bestätigen:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Änderung bestätigen
        </Button>
        <Text style={footer}>
          Falls du diese Änderung nicht angefordert hast, sichere dein Konto
          umgehend.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
