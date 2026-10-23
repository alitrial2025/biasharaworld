import { admin, ApiError } from './server';

export const productImagePath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
export async function validateProductImage(businessId: string, command: unknown) {
  const input = command as {type?: string; product?: {imagePath?: unknown}; changes?: {imagePath?: unknown}};
  const path = input?.type === 'addProduct' ? input.product?.imagePath : input?.type === 'updateProduct' ? input.changes?.imagePath : undefined;
  if (path === undefined || path === null) return;
  if (typeof path !== 'string' || !productImagePath.test(path) || !path.startsWith(businessId + '/'))
    throw new ApiError('Choose a product photo uploaded to this business.', 400);
  const name = path.slice(businessId.length + 1);
  const {data, error} = await admin().storage.from('product-images').list(businessId, {search: name, limit: 10});
  if (error) throw new ApiError('Could not verify this product photo. Please retry.', 503);
  if (!data.some(file => file.name === name)) throw new ApiError('This photo is not available. Upload it again before saving.', 400);
}
