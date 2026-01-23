import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsSaudiPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSaudiPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && /^05\d{8}$/.test(value);
        },
        defaultMessage(): string {
          return 'يجب أن يبدأ رقم الهاتف بـ 05 ويتكون من 10 أرقام';
        },
      },
    });
  };
}
