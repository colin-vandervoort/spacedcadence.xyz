import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
// import * as iam from 'aws-cdk-lib/aws-iam';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';

import path from 'node:path';
import { Construct } from 'constructs';
import {
  // AwsSolutionsChecks,
  NagSuppressions
} from 'cdk-nag';
import { Duration } from 'aws-cdk-lib';

export interface SiteStackProps extends cdk.StackProps {
  primaryDomain: string;
  alternateDomains: Array<string>;
  primaryBucketName: string;
  secondaryBucketName: string;
  removalPolicy?: cdk.RemovalPolicy,
}

export class SiteStack extends cdk.Stack {

  readonly primaryBucket: s3.Bucket;
  readonly secondaryBucket: s3.Bucket;
  readonly certificate: acm.Certificate;
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;

    const zone = route53.HostedZone.fromLookup(this, 'SpacedcadenceZone', {
      domainName: 'spacedcadence.xyz',
    })

    const commonBucketProps: Partial<s3.BucketProps> = {
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
    }

    this.secondaryBucket = new s3.Bucket(this, 'SecondaryBucket', {
      ...commonBucketProps,
      bucketName: props.secondaryBucketName,
      intelligentTieringConfigurations: [
        {
          name: 'LogArchiving',
          archiveAccessTierTime: cdk.Duration.days(90),
          deepArchiveAccessTierTime: cdk.Duration.days(180),
          prefix: 'log/'
        }
      ]
    })
    NagSuppressions.addResourceSuppressions(this.secondaryBucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'Skip access logging for secondary utility bucket.',
      },
    ])

    this.primaryBucket = new s3.Bucket(this, 'PrimaryBucket', {
      ...commonBucketProps,
      bucketName: props.primaryBucketName,
      serverAccessLogsBucket: this.secondaryBucket,
      serverAccessLogsPrefix: 'log/bucket-primary/access/',
    });

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.primaryDomain,
      subjectAlternativeNames: props.alternateDomains,
      validation: acm.CertificateValidation.fromDns(zone),
    })

    const domainNames = [
      props.primaryDomain,
      ...props.alternateDomains
    ];

    const cspDirectives = [
      `default-src ${ domainNames.join(' ') }`,
    ];

    const permissionsPolicies = [
      'camera=()',
      'display-capture=()',
      'fullscreen=()',
      'geolocation=()',
      'microphone=()',
    ];

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'ResponseHadersPolicy', {
      responseHeadersPolicyName: 'SpacedcadenceResponseHeaders',
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: cspDirectives.join('; '),
          override: true,
        },
        contentTypeOptions: {
          override: true,
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.seconds(63_072_000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: permissionsPolicies.join(', '),
            override: true,
          },
        ],
      },
    });

    this.distribution = new cloudfront.Distribution(this, 'CloudfrontDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.primaryBucket, {
          originPath: '/www'
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: responseHeadersPolicy,
        functionAssociations: [
          {
            function: new cloudfront.Function(this, 'ViewerRequestFunction', {
              functionName: 'RedirectAndRewriteFunction',
              comment: 'Enable pretty webpage links and redirect users from invalid locations',
              code: cloudfront.FunctionCode.fromFile({
                filePath: path.join(__dirname, 'viewer-request.js'),
              }),
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
          {
            function: new cloudfront.Function(this, 'ViewerResponseFunction', {
              functionName: 'CacheControlFunction',
              comment: 'Set Cache-Control header based on Content-Type',
              code: cloudfront.FunctionCode.fromFile({
                filePath: path.join(__dirname, 'viewer-response.js'),
              }),
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          }
        ],
        edgeLambdas: [],
      },
      domainNames: domainNames,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
        }
      ],
      certificate: this.certificate,
      defaultRootObject: 'index.html',
      enableIpv6: true,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      logBucket: this.secondaryBucket,
      logFilePrefix: 'log/distribution/access',
    })
    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Skip georestrictions.',
      },
      {
        id: 'AwsSolutions-CFR2',
        reason: 'AWS WAF is not warranted for this static read-only website.',
      },
    ])

    const cloudfrontAlias = new targets.CloudFrontTarget(this.distribution);

    const commonRecordProps: Pick<route53.RecordSetProps, 'zone' | 'recordName' | 'target'> = {
      zone,
      target: route53.RecordTarget.fromAlias(cloudfrontAlias),
    }
    new route53.ARecord(this, 'DnsRecordA', {
      ...commonRecordProps,
      recordName: props.primaryDomain,
    })
    new route53.AaaaRecord(this, 'DnsRecordAaaa', {
      ...commonRecordProps,
      recordName: props.primaryDomain,
    })
    for (const d of props.alternateDomains) {
      new route53.ARecord(this, `DnsRecordA-${ d }`, {
        ...commonRecordProps,
        recordName: d,
      })
      new route53.AaaaRecord(this, `DnsRecordAaaa-${ d }`, {
        ...commonRecordProps,
        recordName: d,
      })
    }
  }
}

export const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

export const bucketNameBase = 'colin-personal-dev-site';

export const liveProps = {
  env: env,
  primaryDomain: 'spacedcadence.xyz',
  alternateDomains: ['www.spacedcadence.xyz'],
  primaryBucketName: `${ bucketNameBase }-live-primary`,
  secondaryBucketName: `${ bucketNameBase }-live-secondary`,
}

const app = new cdk.App();
// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

new SiteStack(app, 'SpacedcadenceTest', {
  env: env,
  primaryDomain: 'test.spacedcadence.xyz',
  alternateDomains: ['www.test.spacedcadence.xyz'],
  primaryBucketName: `${ bucketNameBase }-test-primary`,
  secondaryBucketName: `${ bucketNameBase }-test-secondary`,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// new SiteStack(app, 'SpacedcadenceLive', liveProps);

app.synth();
