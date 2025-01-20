import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddPlanDto } from './dto/AddDataPlanDto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiProviderService } from 'src/api-providers/api-providers.service';
import { AddCablPlanDto } from './dto/AddCablPlanDto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiProvider: ApiProviderService,
  ) {}

  async addDataPlan(body: AddPlanDto) {
    const dataPlan = await this.prisma.dataPlan.findFirst({
      where: {
        operatorId: body.operatorId,
        network: body.network,
      },
    });

    if (dataPlan)
      throw new BadRequestException(
        'Data plan with operation id already exist',
      );

    // create new data plan
    await this.prisma.dataPlan.create({
      data: {
        network: body.network,
        operatorId: body.operatorId,
        planName: body.planName,
        countryISOCode: this.apiProvider.getCountryCodeFromCurrency(
          body.currency,
        ),
      },
    });

    return {
      message: 'Data plan added successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async addAirtimePlan(body: AddPlanDto) {
    const airtimePlan = await this.prisma.airtimePlan.findFirst({
      where: {
        operatorId: body.operatorId,
        network: body.network,
      },
    });

    if (airtimePlan)
      throw new BadRequestException(
        'Airtime plan with operation id already exist',
      );

    // create new airtime plan
    await this.prisma.airtimePlan.create({
      data: {
        network: body.network,
        operatorId: body.operatorId,
        planName: body.planName,
        countryISOCode: this.apiProvider.getCountryCodeFromCurrency(
          body.currency,
        ),
      },
    });

    return {
      message: 'Airtime plan added successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async addCablePlan(body: AddCablPlanDto) {
    const cablePlan = await this.prisma.cablePlan.findFirst({
      where: {
        billerCode: body.billerCode,
        planName: body.planName,
      },
    });

    if (cablePlan)
      throw new BadRequestException(
        'Cable plan with biller code already exist',
      );

    await this.prisma.cablePlan.create({
      data: {
        planName: body.planName,
        countryISOCode: this.apiProvider.getCountryCodeFromCurrency(
          body.currency,
        ),
        billerCode: body.billerCode,
        description: body.description,
        shortName: body.shortName,
      },
    });

    return {
      message: 'Cable plan added successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async addElectricityPlan(body: AddCablPlanDto) {
    const electricityPlan = await this.prisma.electricityPlan.findFirst({
      where: {
        billerCode: body.billerCode,
        planName: body.planName,
      },
    });

    if (electricityPlan)
      throw new BadRequestException(
        'Electricity plan with biller code already exist',
      );

    await this.prisma.electricityPlan.create({
      data: {
        planName: body.planName,
        countryISOCode: this.apiProvider.getCountryCodeFromCurrency(
          body.currency,
        ),
        billerCode: body.billerCode,
        description: body.description,
        shortName: body.shortName,
      },
    });

    return {
      message: 'Electricity plan added successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async addInternetServicePlan(body: AddCablPlanDto) {
    const internetservicePlan = await this.prisma.electricityPlan.findFirst({
      where: {
        billerCode: body.billerCode,
        planName: body.planName,
      },
    });

    if (internetservicePlan)
      throw new BadRequestException(
        'Internet service plan with biller code already exist',
      );

    await this.prisma.internetservicePlan.create({
      data: {
        planName: body.planName,
        countryISOCode: this.apiProvider.getCountryCodeFromCurrency(
          body.currency,
        ),
        billerCode: body.billerCode,
        description: body.description,
        shortName: body.shortName,
      },
    });

    return {
      message: 'Internet service plan added successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async addTransportPlan(body: AddCablPlanDto) {
    const transportPlan = await this.prisma.transportPlan.findFirst({
      where: {
        billerCode: body.billerCode,
        planName: body.planName,
      },
    });

    if (transportPlan)
      throw new BadRequestException(
        'Transport plan with biller code already exist',
      );

    await this.prisma.transportPlan.create({
      data: {
        planName: body.planName,
        countryISOCode: this.apiProvider.getCountryCodeFromCurrency(
          body.currency,
        ),
        billerCode: body.billerCode,
        description: body.description,
        shortName: body.shortName,
      },
    });

    return {
      message: 'Transport plan added successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async addSchoolFeePlan(body: AddCablPlanDto) {
    const schoolFeePlan = await this.prisma.schoolfeePlan.findFirst({
      where: {
        billerCode: body.billerCode,
        planName: body.planName,
      },
    });

    if (schoolFeePlan)
      throw new BadRequestException(
        'School fee plan with biller code already exist',
      );

    await this.prisma.schoolfeePlan.create({
      data: {
        planName: body.planName,
        countryISOCode: this.apiProvider.getCountryCodeFromCurrency(
          body.currency,
        ),
        billerCode: body.billerCode,
        description: body.description,
        shortName: body.shortName,
      },
    });

    return {
      message: 'School fee plan added successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async deletePlan(id: string, bill_type: string) {
    switch (bill_type) {
      case 'data':
        const exitsingDataPlan = await this.prisma.dataPlan.findFirst({
          where: {
            id,
          },
        });

        if (!exitsingDataPlan)
          throw new NotFoundException('Data plan with id not found');

        // delete
        await this.prisma.dataPlan.delete({
          where: {
            id,
          },
        });

        break;
      case 'airtime':
        const exitsingAirtimePlan = await this.prisma.dataPlan.findFirst({
          where: {
            id,
          },
        });

        if (!exitsingAirtimePlan)
          throw new NotFoundException('Airtime plan with id not found');

        // delete
        await this.prisma.airtimePlan.delete({
          where: {
            id,
          },
        });
        break;
      default:
        console.log('no bill type match found');
    }

    return {
      message: 'Plan with id deleted successfully',
      statusCode: HttpStatus.OK,
    };
  }
}
