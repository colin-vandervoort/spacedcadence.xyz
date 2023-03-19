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

export interface SiteStackProps extends cdk.StackProps {
  hostname: string;
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
      serverAccessLogsPrefix: 'log/primary-bucket/access/',
    });

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.hostname,
      validation: acm.CertificateValidation.fromDns(zone),
    })

    const prettyUrlFunction = new cloudfront.Function(this, 'ViewerRequestFunction', {
      functionName: 'RedirectsAndRewrites',
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, 'viewer-request.js'),
      }),
    })

    this.distribution = new cloudfront.Distribution(this, 'CloudfrontDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.primaryBucket, {
          originPath: '/www'
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{
          function: prettyUrlFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
        edgeLambdas: [],
      },
      domainNames: [
        props.hostname,
      ],
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
      recordName: props.hostname,
      target: route53.RecordTarget.fromAlias(cloudfrontAlias),
    }
    new route53.ARecord(this, 'DnsRecordA', {
      ...commonRecordProps,
    })
    new route53.AaaaRecord(this, 'DnsRecordAaaa', {
      ...commonRecordProps,
    })
  }
}

export const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

export const bucketNameBase = 'colin-personal-dev-site';

export const liveProps = {
  env: env,
  hostname: 'spacedcadence.xyz',
  primaryBucketName: `${ bucketNameBase }-live-primary`,
  secondaryBucketName: `${ bucketNameBase }-live-secondary`,
}

const app = new cdk.App();
// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

new SiteStack(app, 'SpacedcadenceTest', {
  env: env,
  hostname: 'test.spacedcadence.xyz',
  primaryBucketName: `${ bucketNameBase }-test-primary`,
  secondaryBucketName: `${ bucketNameBase }-test-secondary`,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
// new s3Deploy.BucketDeployment(testStack, 'TestHtml', {
//   sources: [
//     s3Deploy.Source.asset(path.join(__dirname, '..', 'test', 'www')),
//   ],
//   destinationBucket: testStack.primaryBucket,
//   destinationKeyPrefix: 'www/',
//   retainOnDelete: false,
// });

// new SiteStack(app, 'SpacedcadenceLive', liveProps);

app.synth();
